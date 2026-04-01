from flask import Blueprint


api_v1_bp = Blueprint("api_v1", __name__, url_prefix="/api/v1")

from . import health as _health
from .auth import register_routes as _register_auth_routes
from .comments import register_routes as _register_comment_routes
from .feeds import register_routes as _register_feed_routes
from .im import register_routes as _register_im_routes
from .notifications import register_routes as _register_notification_routes
from .posts import register_routes as _register_post_routes
from .search import register_routes as _register_search_routes
from .services import register_routes as _register_service_routes
from .shop import register_routes as _register_shop_routes
from .uploads import register_routes as _register_upload_routes
from .users import register_routes as _register_user_routes
from .vaccines import register_routes as _register_vaccine_routes
from .admin import register_routes as _register_admin_routes

_register_auth_routes(api_v1_bp)
_register_feed_routes(api_v1_bp)
_register_im_routes(api_v1_bp)
_register_notification_routes(api_v1_bp)
_register_post_routes(api_v1_bp)
_register_comment_routes(api_v1_bp)
_register_user_routes(api_v1_bp)
_register_search_routes(api_v1_bp)
_register_service_routes(api_v1_bp)
_register_vaccine_routes(api_v1_bp)
_register_shop_routes(api_v1_bp)
_register_upload_routes(api_v1_bp)
_register_admin_routes(api_v1_bp)
