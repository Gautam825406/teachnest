from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import get_current_user
from ..models import CourseCategory, CourseSubcategory, User
from ..schemas import CategoryCreate, CategoryOut, SubcategoryCreate, SubcategoryOut

router = APIRouter(tags=["categories"])


# --- Course categories ---
@router.get("/course-categories", response_model=list[CategoryOut])
def list_categories(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(CourseCategory).filter(CourseCategory.tenant_id == user.tenant_id).order_by(CourseCategory.id).all()


@router.post("/course-categories", response_model=CategoryOut, status_code=201)
def create_category(payload: CategoryCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    cat = CourseCategory(tenant_id=user.tenant_id, name=payload.name)
    db.add(cat)
    db.commit()
    db.refresh(cat)
    return cat


@router.put("/course-categories/{category_id}", response_model=CategoryOut)
def update_category(category_id: int, payload: CategoryCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    cat = db.query(CourseCategory).filter(CourseCategory.id == category_id, CourseCategory.tenant_id == user.tenant_id).first()
    if cat is None:
        raise HTTPException(status_code=404, detail="Category not found")
    cat.name = payload.name
    db.commit()
    db.refresh(cat)
    return cat


@router.delete("/course-categories/{category_id}", status_code=204)
def delete_category(category_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    cat = db.query(CourseCategory).filter(CourseCategory.id == category_id, CourseCategory.tenant_id == user.tenant_id).first()
    if cat is None:
        raise HTTPException(status_code=404, detail="Category not found")
    db.delete(cat)
    db.commit()
    return None


# --- Course subcategories ---
@router.get("/course-subcategories", response_model=list[SubcategoryOut])
def list_subcategories(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(CourseSubcategory).filter(CourseSubcategory.tenant_id == user.tenant_id).order_by(CourseSubcategory.id).all()


@router.post("/course-subcategories", response_model=SubcategoryOut, status_code=201)
def create_subcategory(payload: SubcategoryCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    parent = db.query(CourseCategory).filter(CourseCategory.id == payload.category_id, CourseCategory.tenant_id == user.tenant_id).first()
    if parent is None:
        raise HTTPException(status_code=404, detail="Category not found")
    sub = CourseSubcategory(tenant_id=user.tenant_id, name=payload.name, category_id=payload.category_id)
    db.add(sub)
    db.commit()
    db.refresh(sub)
    return sub


@router.put("/course-subcategories/{subcategory_id}", response_model=SubcategoryOut)
def update_subcategory(subcategory_id: int, payload: SubcategoryCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    sub = db.query(CourseSubcategory).filter(CourseSubcategory.id == subcategory_id, CourseSubcategory.tenant_id == user.tenant_id).first()
    if sub is None:
        raise HTTPException(status_code=404, detail="Subcategory not found")
    sub.name = payload.name
    sub.category_id = payload.category_id
    db.commit()
    db.refresh(sub)
    return sub


@router.delete("/course-subcategories/{subcategory_id}", status_code=204)
def delete_subcategory(subcategory_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    sub = db.query(CourseSubcategory).filter(CourseSubcategory.id == subcategory_id, CourseSubcategory.tenant_id == user.tenant_id).first()
    if sub is None:
        raise HTTPException(status_code=404, detail="Subcategory not found")
    db.delete(sub)
    db.commit()
    return None
