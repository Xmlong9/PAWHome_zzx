export interface BannerItem {
  id: number
  slot: string
  imageUrl: string
  title?: string
  subTitle?: string
  ctaText?: string
  linkUrl?: string
  badge?: string
  bgColor?: string
  borderRadius?: number
  shadowOffsetX?: number
  shadowOffsetY?: number
}

export interface CommunityCard {
  id: number
  imageUrl: string
  title: string
  linkUrl?: string
  badge?: string
}
