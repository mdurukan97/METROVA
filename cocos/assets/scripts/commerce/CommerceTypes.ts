export type CosmeticSlot='train-skin'|'line-theme'|'station-symbols'|'map-theme'|'audio-pack'|'profile-badge'|'profile-frame';
export type ProductKind='coin-cosmetic'|'remove-ads'|'supporter-pack'|'paid-cosmetic';
export type PurchaseState='pending'|'purchased-unverified'|'verified'|'acknowledged'|'canceled'|'refunded'|'revoked';
export type ConsentState='unknown'|'required'|'obtained'|'not-required'|'denied';

export type StoreProductDefinition={
  id:string;
  displayName:string;
  kind:ProductKind;
  playProductId?:string;
  coinPrice?:number;
  grants:ProductGrant[];
};

export type ProductGrant=
  |{type:'entitlement';id:string}
  |{type:'cosmetic';id:string;slot:CosmeticSlot};

export type CosmeticDefinition={id:string;displayName:string;slot:CosmeticSlot};

export type CommerceInventory={
  ownedCosmeticIds:string[];
  equippedBySlot:Partial<Record<CosmeticSlot,string>>;
  entitlements:string[];
};

export type PurchaseRecord={
  purchaseToken:string;
  productId:string;
  state:PurchaseState;
  verification:'unverified'|'verified';
  acknowledged:boolean;
  updatedAtIso:string;
  source:'play'|'play-test';
};

export type PurchaseLedger={records:Record<string,PurchaseRecord>};

export type CommerceState={
  schemaVersion:1;
  inventory:CommerceInventory;
  ledger:PurchaseLedger;
  consent:ConsentState;
  rewardedReceiptIds:string[];
};

export type MetroCoinWallet={metroCoin:number};

export type RewardedActionDefinition={
  id:string;
  placement:'store';
  reward:{type:'store-refresh'|'cosmetic-preview';amount?:number;cosmeticId?:string;durationSeconds?:number};
};
