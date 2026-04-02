import os
import sys
from werkzeug.security import generate_password_hash

# Add the backend directory to sys.path so we can import app modules
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app import create_app
from app.extensions import db
from app.models import AdminUser, AdminRole, RolePermission, AdminLog, SystemConfig

app = create_app()

def migrate():
    with app.app_context():
        print("Creating admin tables...")
        # Create all tables that don't exist yet
        db.create_all()
        
        print("Checking for superadmin role...")
        super_role = AdminRole.query.filter_by(name="superadmin").first()
        if not super_role:
            super_role = AdminRole(name="superadmin", description="超级管理员")
            db.session.add(super_role)
            db.session.commit()
            print("Created superadmin role.")
        
        print("Checking for default admin user...")
        admin_user = AdminUser.query.filter_by(username="admin").first()
        if not admin_user:
            admin_user = AdminUser(
                username="admin",
                password_hash=generate_password_hash("admin123"),
                name="超级管理员",
                role_id=super_role.id,
                status="active"
            )
            db.session.add(admin_user)
            db.session.commit()
            print("Created default admin user (admin / admin123).")
        else:
            print("Default admin user already exists.")
            
        print("Migration complete.")

if __name__ == "__main__":
    migrate()
