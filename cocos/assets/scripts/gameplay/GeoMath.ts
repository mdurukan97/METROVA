export class GeoMath {
  static distanceKm(a:{lat:number;lon:number}, b:{lat:number;lon:number}) {
    const r=6371;
    const dLat=this.rad(b.lat-a.lat);
    const dLon=this.rad(b.lon-a.lon);
    const lat1=this.rad(a.lat), lat2=this.rad(b.lat);
    const h=Math.sin(dLat/2)**2+Math.cos(lat1)*Math.cos(lat2)*Math.sin(dLon/2)**2;
    return 2*r*Math.asin(Math.sqrt(h));
  }

  static segmentCostM(distanceKm:number,tunnel:boolean) {
    const rail=Math.max(1.2,distanceKm*0.72);
    return Math.round(rail*(tunnel?1.85:1)*10)/10;
  }

  private static rad(v:number){ return v*Math.PI/180; }
}
