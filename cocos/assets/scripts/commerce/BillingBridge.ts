import type {PurchaseRecord} from './CommerceTypes';

export type BillingAvailability={available:boolean;reason?:string};
export type BillingProduct={productId:string;localizedPrice:string};

export interface BillingBridge {
  availability():Promise<BillingAvailability>;
  queryProducts(productIds:string[]):Promise<BillingProduct[]>;
  beginPurchase(productId:string):Promise<PurchaseRecord>;
  restorePurchases():Promise<PurchaseRecord[]>;
}

export class UnavailableBillingBridge implements BillingBridge {
  constructor(private readonly reason='Android billing bridge is not configured'){}
  async availability(){return {available:false,reason:this.reason};}
  async queryProducts(_productIds:string[]){return [];}
  async beginPurchase(_productId:string):Promise<PurchaseRecord>{throw new Error(this.reason);}
  async restorePurchases(){return [];}
}
