from flask import request
import json
from ....extensions import db
from ....models import (
    Post,
    User,
    Comment,
    PostLike,
    PostFavorite,
    PostHistory,
    PostPin,
    CommentLike,
    CommentPin,
    Notification,
)
from ....responses import ok, fail
from .auth import admin_required, log_admin_action

def _iso(dt):
    return dt.isoformat() + "Z" if dt else None

def _pagination_args():
    page = request.args.get("page", 1, type=int)
    size = request.args.get("pageSize", None, type=int)
    if size is None:
        size = request.args.get("size", 10, type=int)
    return page, size

def _parse_media_stats(media_json: str | None):
    image_count = 0
    video_count = 0
    text_type = "text"
    if isinstance(media_json, str) and media_json.strip():
        try:
            val = json.loads(media_json)
            if isinstance(val, dict):
                t = val.get("type")
                if isinstance(t, str) and t == "video":
                    video_url = val.get("url") or val.get("video") or val.get("videoUrl")
                    if isinstance(video_url, str) and video_url:
                        video_count = 1
                        text_type = "video"
                        return image_count, video_count, text_type
                images = val.get("images")
                if isinstance(images, list):
                    image_count = len([x for x in images if isinstance(x, (str, int, float))])
                    if image_count > 0:
                        text_type = "image"
            elif isinstance(val, list):
                image_count = len([x for x in val if isinstance(x, (str, int, float))])
                if image_count > 0:
                    text_type = "image"
        except Exception:
            pass
    return image_count, video_count, text_type

def register_admin_posts_routes(bp):
    @bp.get("/admin/content/posts")
    @admin_required
    def get_content_posts():
        page, size = _pagination_args()
        pagination = (
            Post.query.order_by(Post.created_at.desc())
            .paginate(page=page, per_page=size, error_out=False)
        )

        items = []
        for post in pagination.items:
            author = User.query.get(post.author_id)
            img_cnt, vid_cnt, text_type = _parse_media_stats(post.media_json)
            items.append(
                {
                    "id": post.id,
                    "author": {
                        "id": post.author_id,
                        "name": author.nickname if author else "Unknown",
                        "avatarUrl": author.avatar_url if author else None,
                    },
                    "contentPreview": (post.content or "")[:80],
                    "mediaStats": {"imageCount": img_cnt, "videoCount": vid_cnt, "textType": text_type},
                    "engagement": {
                        "likeCount": post.like_count,
                        "commentCount": post.comment_count,
                    },
                    "publishedAt": _iso(post.created_at),
                }
            )

        return ok(
            {
                "items": items,
                "total": pagination.total,
                "page": page,
                "pageSize": size,
            }
        )

    @bp.get("/admin/content/comments")
    @admin_required
    def get_content_comments():
        page, size = _pagination_args()
        pagination = (
            Comment.query.order_by(Comment.created_at.desc())
            .paginate(page=page, per_page=size, error_out=False)
        )

        items = []
        for c in pagination.items:
            author = User.query.get(c.author_id)
            post = Post.query.get(c.post_id)
            title = ""
            if post and isinstance(post.content, str):
                title = post.content.strip().replace("\n", " ")[:24]
            items.append(
                {
                    "id": c.id,
                    "user": {
                        "id": c.author_id,
                        "name": author.nickname if author else "Unknown",
                        "avatarUrl": author.avatar_url if author else None,
                        "levelText": None,
                    },
                    "post": {"id": c.post_id, "title": title or "-"},
                    "content": c.content,
                    "likeCount": c.like_count,
                    "status": "approved",
                    "createdAt": _iso(c.created_at),
                }
            )

        return ok(
            {
                "items": items,
                "total": pagination.total,
                "page": page,
                "pageSize": size,
            }
        )

    @bp.get("/admin/posts")
    @admin_required
    def get_posts():
        page, size = _pagination_args()
        
        query = Post.query

        pagination = query.order_by(Post.created_at.desc()).paginate(page=page, per_page=size, error_out=False)

        posts = []
        for post in pagination.items:
            author = User.query.get(post.author_id)
            posts.append({
                "id": post.id,
                "content": post.content,
                "author_id": post.author_id,
                "author_name": author.nickname if author else "Unknown",
                "like_count": post.like_count,
                "comment_count": post.comment_count,
                "created_at": _iso(post.created_at),
                "visibility": post.visibility
            })

        return ok({
            "items": posts,
            "total": pagination.total,
            "page": page,
            "size": size
        })

    @bp.delete("/admin/posts/<post_id>")
    @admin_required
    def admin_delete_post(post_id):
        post = Post.query.get(post_id)
        if not post:
            return fail(code="NOT_FOUND", message="Post not found", status_code=404)
            
        # Clean up all related tables to avoid foreign key constraint violations
        try:
            # Post interactions
            PostLike.query.filter_by(post_id=post_id).delete(synchronize_session=False)
            PostFavorite.query.filter_by(post_id=post_id).delete(synchronize_session=False)
            PostHistory.query.filter_by(post_id=post_id).delete(synchronize_session=False)
            PostPin.query.filter_by(post_id=post_id).delete(synchronize_session=False)
            
            # Comment interactions and pins
            CommentPin.query.filter_by(post_id=post_id).delete(synchronize_session=False)
            
            # Find all comment IDs to clean up comment likes and notifications
            comment_ids = [c.id for c in Comment.query.filter_by(post_id=post_id).all()]
            if comment_ids:
                CommentLike.query.filter(CommentLike.comment_id.in_(comment_ids)).delete(synchronize_session=False)
                Notification.query.filter(Notification.comment_id.in_(comment_ids)).delete(synchronize_session=False)
                Comment.query.filter(Comment.id.in_(comment_ids)).delete(synchronize_session=False)
            
            # Post notifications
            Notification.query.filter_by(post_id=post_id).delete(synchronize_session=False)
            
            # Finally delete the post itself
            db.session.delete(post)
            db.session.commit()
            
            log_admin_action("delete_post", "post", post_id)
            return ok({"message": "Post deleted successfully"})
            
        except Exception as e:
            db.session.rollback()
            return fail(code="INTERNAL_ERROR", message=str(e), status_code=500)

    @bp.get("/admin/posts/<post_id>")
    @admin_required
    def get_admin_post_detail(post_id):
        post = Post.query.get(post_id)
        if not post:
            return fail(code="NOT_FOUND", message="Post not found", status_code=404)
        
        author = User.query.get(post.author_id)
        img_cnt, vid_cnt, text_type = _parse_media_stats(post.media_json)
        
        return ok({
            "id": post.id,
            "author": {
                "id": post.author_id,
                "name": author.nickname if author else "Unknown",
                "avatarUrl": author.avatar_url if author else None,
            },
            "contentPreview": post.content,
            "mediaStats": {"imageCount": img_cnt, "videoCount": vid_cnt, "textType": text_type},
            "engagement": {
                "likeCount": post.like_count,
                "commentCount": post.comment_count,
            },
            "publishedAt": _iso(post.created_at),
        })

    @bp.put("/admin/posts/<post_id>")
    @admin_required
    def update_admin_post(post_id):
        post = Post.query.get(post_id)
        if not post:
            return fail(code="NOT_FOUND", message="Post not found", status_code=404)
        
        data = request.json or {}
        if "contentPreview" in data:
            post.content = data["contentPreview"]
        
        db.session.commit()
        log_admin_action("update_post", "post", post_id)
        
        return ok({"message": "Post updated successfully"})

    @bp.get("/admin/comments")
    @admin_required
    def get_comments():
        page, size = _pagination_args()
        
        query = Comment.query

        pagination = query.order_by(Comment.created_at.desc()).paginate(page=page, per_page=size, error_out=False)

        comments = []
        for comment in pagination.items:
            author = User.query.get(comment.author_id)
            comments.append({
                "id": comment.id,
                "post_id": comment.post_id,
                "content": comment.content,
                "author_id": comment.author_id,
                "author_name": author.nickname if author else "Unknown",
                "like_count": comment.like_count,
                "created_at": _iso(comment.created_at),
            })

        return ok({
            "items": comments,
            "total": pagination.total,
            "page": page,
            "size": size
        })

    @bp.delete("/admin/comments/<comment_id>")
    @admin_required
    def admin_delete_comment(comment_id):
        comment = Comment.query.get(comment_id)
        if not comment:
            return fail(code="NOT_FOUND", message="Comment not found", status_code=404)
            
        try:
            # Clean up related interactions
            CommentLike.query.filter_by(comment_id=comment_id).delete(synchronize_session=False)
            Notification.query.filter_by(comment_id=comment_id).delete(synchronize_session=False)
            CommentPin.query.filter_by(comment_id=comment_id).delete(synchronize_session=False)
            
            # Handle sub-comments (recursive cleanup if needed, but simple one-level for now)
            # Find all sub-comments to clean them up too
            sub_comment_ids = [c.id for c in Comment.query.filter_by(parent_id=comment_id).all()]
            if sub_comment_ids:
                CommentLike.query.filter(CommentLike.comment_id.in_(sub_comment_ids)).delete(synchronize_session=False)
                Notification.query.filter(Notification.comment_id.in_(sub_comment_ids)).delete(synchronize_session=False)
                Comment.query.filter(Comment.id.in_(sub_comment_ids)).delete(synchronize_session=False)

            # Update post comment count
            post = Post.query.get(comment.post_id)
            if post:
                # Count current comments for this post to be accurate
                actual_count = Comment.query.filter_by(post_id=comment.post_id).count()
                post.comment_count = max(0, actual_count - 1 - len(sub_comment_ids))
                
            db.session.delete(comment)
            db.session.commit()
            
            log_admin_action("delete_comment", "comment", comment_id)
            return ok({"message": "Comment deleted successfully"})
            
        except Exception as e:
            db.session.rollback()
            return fail(code="INTERNAL_ERROR", message=str(e), status_code=500)
