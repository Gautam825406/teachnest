import csv
import io

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import get_current_user
from ..models import Order, Student, User
from ..schemas import OrderOut, OrderRefundRequest, OrderTransferRequest, PaginatedOrders

router = APIRouter(prefix="/orders", tags=["orders"])


@router.get("", response_model=PaginatedOrders)
def list_orders(
    search: str | None = None,
    status: str | None = None,
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    q = db.query(Order).filter(Order.tenant_id == user.tenant_id)
    if search:
        q = q.filter(
            (Order.student_name.ilike(f"%{search}%"))
            | (Order.transaction_id.ilike(f"%{search}%"))
            | (Order.contact.ilike(f"%{search}%"))
        )
    if status:
        q = q.filter(Order.status == status.upper())
    total = q.count()
    items = q.order_by(Order.id.desc()).offset((page - 1) * per_page).limit(per_page).all()
    return {"items": items, "total": total}


@router.get("/export")
def export_orders(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    orders = (
        db.query(Order)
        .filter(Order.tenant_id == user.tenant_id)
        .order_by(Order.id.desc())
        .all()
    )
    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow(["student", "contact", "status", "transaction_id", "date", "amount", "items"])
    for o in orders:
        writer.writerow([
            o.student_name, o.contact, o.status, o.transaction_id,
            o.created_at.isoformat() if o.created_at else "",
            f"{o.amount:.2f}", "; ".join(o.items or []),
        ])
    buf.seek(0)
    return StreamingResponse(
        iter([buf.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=orders.csv"},
    )



@router.get("/deactivated", response_model=PaginatedOrders)
def list_deactivated_orders(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    q = db.query(Order).filter(Order.tenant_id == user.tenant_id, Order.status == "DEACTIVATED")
    total = q.count()
    items = q.order_by(Order.id.desc()).offset((page - 1) * per_page).limit(per_page).all()
    return {"items": items, "total": total}


@router.get("/company", response_model=PaginatedOrders)
def list_company_orders(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # Company Orders view: all orders for the tenant (same as All Orders).
    q = db.query(Order).filter(Order.tenant_id == user.tenant_id)
    total = q.count()
    items = q.order_by(Order.id.desc()).offset((page - 1) * per_page).limit(per_page).all()
    return {"items": items, "total": total}


@router.post("/{order_id}/transfer", response_model=OrderOut)
def transfer_order(order_id: int, payload: OrderTransferRequest, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    order = db.query(Order).filter(Order.id == order_id, Order.tenant_id == user.tenant_id).first()
    if order is None:
        raise HTTPException(status_code=404, detail="Order not found")
    target = db.query(Student).filter(Student.id == payload.to_student_id, Student.tenant_id == user.tenant_id).first()
    if target is None:
        raise HTTPException(status_code=404, detail="Student not found")
    order.student_id = target.id
    order.student_name = target.name
    order.contact = target.phone
    db.commit()
    db.refresh(order)
    return order


@router.post("/{order_id}/refund", response_model=OrderOut)
def refund_order(order_id: int, payload: OrderRefundRequest, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    order = db.query(Order).filter(Order.id == order_id, Order.tenant_id == user.tenant_id).first()
    if order is None:
        raise HTTPException(status_code=404, detail="Order not found")
    order.status = "REFUNDED"
    db.commit()
    db.refresh(order)
    return order


@router.post("/{order_id}/deactivate", response_model=OrderOut)
def deactivate_order(order_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    order = db.query(Order).filter(Order.id == order_id, Order.tenant_id == user.tenant_id).first()
    if order is None:
        raise HTTPException(status_code=404, detail="Order not found")
    order.status = "DEACTIVATED"
    db.commit()
    db.refresh(order)
    return order


@router.get("/{order_id}", response_model=OrderOut)
def get_order(order_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    order = db.query(Order).filter(Order.id == order_id, Order.tenant_id == user.tenant_id).first()
    if order is None:
        raise HTTPException(status_code=404, detail="Order not found")
    return order
