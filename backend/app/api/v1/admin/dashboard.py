from datetime import datetime, timedelta
import json
from sqlalchemy import func
from ....extensions import db
from ....models import Comment, Post, PostLike, ServiceAppointment, ShopOrder, User
from ....responses import ok
from .auth import admin_required

def _today_start():
    now = datetime.utcnow()
    return datetime(now.year, now.month, now.day)

def _get_last_7_days():
    today = _today_start()
    return [(today - timedelta(days=i)) for i in range(6, -1, -1)]

def register_admin_dashboard_routes(bp):
    @bp.get("/admin/dashboard/stats")
    @admin_required
    def get_dashboard_stats():
        today = _today_start()
        paid_statuses = {"completed", "done", "shipping", "shipped", "pending_ship"}
        
        # User stats
        total_users = User.query.count()
        today_users = User.query.filter(User.created_at >= today).count()
        
        # Post stats
        total_posts = Post.query.count()
        today_posts = Post.query.filter(Post.created_at >= today).count()
        
        # Order stats
        total_orders = ShopOrder.query.count()
        today_orders = ShopOrder.query.filter(ShopOrder.created_at >= today).count()
        
        # Revenue stats (paid orders)
        paid_orders = ShopOrder.query.filter(ShopOrder.status.in_(paid_statuses)).all()
        total_revenue = sum(o.total_cents for o in paid_orders)
        
        today_paid_orders = ShopOrder.query.filter(
            ShopOrder.status.in_(paid_statuses),
            ShopOrder.created_at >= today
        ).all()
        today_revenue = sum(o.total_cents for o in today_paid_orders)
        
        # Appointment stats
        total_appointments = ServiceAppointment.query.count()
        today_appointments = ServiceAppointment.query.filter(ServiceAppointment.created_at >= today).count()

        # --- Chart Data Generation ---
        last_7_days = _get_last_7_days()
        date_labels = [d.strftime('%Y-%m-%d') for d in last_7_days]

        # 1. Revenue & Order Trend (Last 7 days)
        revenue_trend = []
        order_trend = []
        for d in last_7_days:
            next_d = d + timedelta(days=1)
            day_orders = ShopOrder.query.filter(
                ShopOrder.created_at >= d,
                ShopOrder.created_at < next_d
            ).all()
            
            order_trend.append(len(day_orders))
            day_revenue = sum(o.total_cents for o in day_orders if o.status in paid_statuses)
            revenue_trend.append(day_revenue / 100)

        # 2. Service Type Distribution
        # Use SQLAlchemy group_by to count Service Appointments by type
        service_types_query = db.session.query(
            ServiceAppointment.service_type, 
            func.count(ServiceAppointment.id)
        ).group_by(ServiceAppointment.service_type).all()
        
        service_distribution = [
            {"name": st[0], "value": st[1]} for st in service_types_query
        ]

        # 3. Community Engagement (Likes & Comments) Trend (Last 7 days)
        likes_trend = []
        comments_trend = []
        for d in last_7_days:
            next_d = d + timedelta(days=1)
            likes_trend.append(
                PostLike.query.filter(PostLike.created_at >= d, PostLike.created_at < next_d).count()
            )
            comments_trend.append(
                Comment.query.filter(Comment.created_at >= d, Comment.created_at < next_d).count()
            )

        # 4. Content Form Distribution (text / image / video)
        text_cnt = 0
        image_cnt = 0
        video_cnt = 0
        media_rows = db.session.query(Post.media_json).all()
        for (media_json,) in media_rows:
            images: list[str] = []
            video_url: str = ""
            if isinstance(media_json, str) and media_json.strip():
                try:
                    val = json.loads(media_json)
                    if isinstance(val, dict):
                        t = val.get("type")
                        if isinstance(t, str) and t == "video":
                            url = val.get("url") or val.get("video") or val.get("videoUrl")
                            if isinstance(url, str) and url:
                                video_url = url
                            cover = val.get("cover")
                            if isinstance(cover, str) and cover:
                                images = [cover]
                        else:
                            maybe_images = val.get("images")
                            if isinstance(maybe_images, list):
                                images = [
                                    str(x)
                                    for x in maybe_images
                                    if isinstance(x, (str, int, float))
                                ]
                            url = val.get("video") or val.get("url") or val.get("videoUrl")
                            if isinstance(url, str) and url:
                                video_url = url
                    elif isinstance(val, list):
                        images = [
                            str(x)
                            for x in val
                            if isinstance(x, (str, int, float))
                        ]
                except Exception:
                    pass
            if video_url:
                video_cnt += 1
            elif images:
                image_cnt += 1
            else:
                text_cnt += 1
        content_form_distribution = [
            {"name": "纯文本", "value": text_cnt},
            {"name": "图文", "value": image_cnt},
            {"name": "视频", "value": video_cnt},
        ]

        return ok({
            "users": {
                "total": total_users,
                "today": today_users
            },
            "posts": {
                "total": total_posts,
                "today": today_posts
            },
            "orders": {
                "total": total_orders,
                "today": today_orders
            },
            "revenue": {
                "total_cents": total_revenue,
                "today_cents": today_revenue
            },
            "appointments": {
                "total": total_appointments,
                "today": today_appointments
            },
            "charts": {
                "dates": date_labels,
                "revenueTrend": revenue_trend,
                "orderTrend": order_trend,
                "serviceDistribution": service_distribution,
                "likesTrend": likes_trend,
                "commentsTrend": comments_trend,
                "contentFormDistribution": content_form_distribution
            }
        })
