from .auth import register_admin_auth_routes
from .users import register_admin_users_routes
from .posts import register_admin_posts_routes
from .shop import register_admin_shop_routes
from .services import register_admin_services_routes
from .dashboard import register_admin_dashboard_routes
from .system import register_admin_system_routes
from .uploads import register_admin_upload_routes

def register_routes(bp):
    register_admin_auth_routes(bp)
    register_admin_users_routes(bp)
    register_admin_posts_routes(bp)
    register_admin_shop_routes(bp)
    register_admin_services_routes(bp)
    register_admin_dashboard_routes(bp)
    register_admin_system_routes(bp)
    register_admin_upload_routes(bp)
