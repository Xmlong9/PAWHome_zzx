import test from "node:test"
import assert from "node:assert/strict"

import { buildServiceDateOptions, buildSuccessQuery } from "./serviceBooking"

test("serviceBooking: buildServiceDateOptions labels today tomorrow after tomorrow", () => {
  const options = buildServiceDateOptions(
    ["2026-03-30", "2026-03-31", "2026-04-01"],
    new Date("2026-03-30T08:00:00+08:00")
  )

  assert.deepEqual(options, [
    { key: "2026-03-30", label: "今天", value: "2026-03-30" },
    { key: "2026-03-31", label: "明天", value: "2026-03-31" },
    { key: "2026-04-01", label: "后天", value: "2026-04-01" }
  ])
})

test("serviceBooking: buildServiceDateOptions parses ISO date strings without day shift", () => {
  const options = buildServiceDateOptions(
    ["2026-03-31T00:00:00Z", "2026-04-01T00:00:00Z", "2026-04-02T00:00:00Z"],
    new Date("2026-03-31T12:00:00+08:00")
  )

  assert.deepEqual(options, [
    { key: "2026-03-31T00:00:00Z", label: "今天", value: "2026-03-31T00:00:00Z" },
    { key: "2026-04-01T00:00:00Z", label: "明天", value: "2026-04-01T00:00:00Z" },
    { key: "2026-04-02T00:00:00Z", label: "后天", value: "2026-04-02T00:00:00Z" }
  ])
})

test("serviceBooking: buildServiceDateOptions filters out past dates and sorts", () => {
  const options = buildServiceDateOptions(
    ["2026-03-30", "2026-04-02", "2026-03-31", "2026-04-01"],
    new Date("2026-03-31T08:00:00+08:00")
  )

  assert.deepEqual(options, [
    { key: "2026-03-31", label: "今天", value: "2026-03-31" },
    { key: "2026-04-01", label: "明天", value: "2026-04-01" },
    { key: "2026-04-02", label: "后天", value: "2026-04-02" }
  ])
})

test("serviceBooking: buildSuccessQuery encodes appointment summary", () => {
  const query = buildSuccessQuery({
    type: "beauty",
    petName: "涛涛",
    itemName: "基础洗护",
    storeName: "汪喵洗护中心",
    date: "2026-03-30",
    time: "10:00"
  })

  assert.equal(
    query,
    "?type=beauty&petName=%E6%B6%9B%E6%B6%9B&itemName=%E5%9F%BA%E7%A1%80%E6%B4%97%E6%8A%A4&storeName=%E6%B1%AA%E5%96%B5%E6%B4%97%E6%8A%A4%E4%B8%AD%E5%BF%83&date=2026-03-30&time=10%3A00"
  )
})
