import { StationAnchor } from './TransitTypes';

// Gameplay infrastructure rule. This does not replace the geographic water mask;
// it gives the tutorial a deterministic cross-continent tunnel rule.
export class BosphorusRule {
  private static asian=new Set(['Üsküdar','Kadıköy','Ümraniye','Ataşehir','Kartal','Pendik','Maltepe','Sancaktepe','Çekmeköy','Sultanbeyli','Tuzla','Beykoz','Şile','Adalar']);

  static side(station:StationAnchor):'europe'|'asia' {
    return this.asian.has(station.district)?'asia':'europe';
  }

  static requiresTunnel(a:StationAnchor,b:StationAnchor) {
    return this.side(a)!==this.side(b);
  }
}
