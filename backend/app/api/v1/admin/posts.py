from flask import request
from ....extensions import db
from ....models import Post, User, Comment
from ....responses import ok, fail
from .auth import admin_required, log_admin_action

def register_admin_posts_routes(bp):
    @bp.get("/admin/posts")
    @admin_required
    def get_posts():
        page = request.args.get("page", 1, type=int)
        size = request.args.get("size", 10, type=int)
        
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
                "created_at": post.created_at.isoformat() + "Z" if post.created_at else None,
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
            
        db.session.delete(post)
        db.session.commit()
        log_admin_action("delete_post", "post", post_id)
        
        return ok({"message": "Post deleted successfully"})

    @bp.get("/admin/comments")
    @admin_required
    def get_comments():
        page = request.args.get("page", 1, type=int)
        size = request.args.get("size", 10, type=int)
        
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
                "created_at": comment.created_at.isoformat() + "Z" if comment.created_at else None,
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
            
        post = Post.query.get(comment.post_id)
        if post and post.comment_count > 0:
            post.comment_count -= 1
            
        db.session.delete(comment)
        db.session.commit()
        log_admin_action("delete_comment", "comment", comment_id)
        
        return ok({"message": "Comment deleted successfully"})
