import { _decorator, Component, EventTouch, Node, Vec2, Vec3 } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('MapCameraController')
export class MapCameraController extends Component {
  @property minZoom = 1.0;
  @property maxZoom = 2.5;
  @property panEnabled = true;

  private lastPinchDistance = 0;
  private panning = false;

  onEnable() {
    this.node.on(Node.EventType.TOUCH_START, this.onTouchStart, this);
    this.node.on(Node.EventType.TOUCH_MOVE, this.onTouchMove, this);
    this.node.on(Node.EventType.TOUCH_END, this.onTouchEnd, this);
    this.node.on(Node.EventType.TOUCH_CANCEL, this.onTouchEnd, this);
  }

  onDisable() {
    this.node.off(Node.EventType.TOUCH_START, this.onTouchStart, this);
    this.node.off(Node.EventType.TOUCH_MOVE, this.onTouchMove, this);
    this.node.off(Node.EventType.TOUCH_END, this.onTouchEnd, this);
    this.node.off(Node.EventType.TOUCH_CANCEL, this.onTouchEnd, this);
  }

  private onTouchStart(event:EventTouch) {
    const touches = event.getAllTouches();
    this.panning = touches.length === 1;
    this.lastPinchDistance = touches.length >= 2 ? this.distance(touches[0].getUILocation(), touches[1].getUILocation()) : 0;
  }

  private onTouchMove(event:EventTouch) {
    const touches = event.getAllTouches();
    if (touches.length >= 2) {
      this.panning = false;
      const a = touches[0].getUILocation();
      const b = touches[1].getUILocation();
      const distance = this.distance(a,b);
      if (this.lastPinchDistance > 0) {
        const current = this.node.scale.x;
        const next = Math.max(this.minZoom, Math.min(this.maxZoom, current * distance / this.lastPinchDistance));
        this.node.setScale(next, next, 1);
      }
      this.lastPinchDistance = distance;
      return;
    }

    if (this.panEnabled && this.panning && touches.length === 1) {
      const delta = event.getUIDelta();
      const pos = this.node.position;
      this.node.setPosition(new Vec3(pos.x + delta.x, pos.y + delta.y, pos.z));
    }
  }

  private onTouchEnd(event:EventTouch) {
    const touches = event.getAllTouches();
    this.panning = touches.length === 1;
    if (touches.length < 2) this.lastPinchDistance = 0;
  }

  private distance(a:Vec2,b:Vec2) {
    return Vec2.distance(a,b);
  }
}
