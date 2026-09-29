import type {
  CommerceState,CosmeticDefinition,CosmeticSlot,MetroCoinWallet,PurchaseRecord,
  RewardedActionDefinition,StoreProductDefinition
} from './CommerceTypes';

export class CommerceService {
  private readonly products:Map<string,StoreProductDefinition>;
  private readonly cosmetics:Map<string,CosmeticDefinition>;
  private readonly rewarded:Map<string,RewardedActionDefinition>;

  constructor(products:StoreProductDefinition[],cosmetics:CosmeticDefinition[],rewarded:RewardedActionDefinition[]){
    this.products=new Map(products.map(product=>[product.id,product]));
    this.cosmetics=new Map(cosmetics.map(cosmetic=>[cosmetic.id,cosmetic]));
    this.rewarded=new Map(rewarded.map(action=>[action.id,action]));
  }

  createState():CommerceState{
    return {schemaVersion:1,inventory:{ownedCosmeticIds:[],equippedBySlot:{},entitlements:[]},ledger:{records:{}},consent:'unknown',rewardedReceiptIds:[]};
  }

  buyWithMetroCoin(productId:string,state:CommerceState,wallet:MetroCoinWallet){
    const product=this.requireProduct(productId);
    if(product.kind!=='coin-cosmetic'||product.coinPrice===undefined)throw new Error(`${productId} is not a Metro Coin product`);
    if(wallet.metroCoin<product.coinPrice)throw new Error(`Not enough Metro Coin for ${productId}`);
    if(product.grants.every(grant=>this.hasGrant(grant,state)))throw new Error(`Product already owned: ${productId}`);
    wallet.metroCoin-=product.coinPrice;
    this.applyGrants(product,state);
  }

  applyPlayPurchase(record:PurchaseRecord,state:CommerceState){
    const product=[...this.products.values()].find(item=>item.playProductId===record.productId);
    if(!product)throw new Error(`Unknown Play product: ${record.productId}`);
    state.ledger.records[record.purchaseToken]={...record};
    const grantable=(record.state==='verified'||record.state==='acknowledged')&&record.verification==='verified';
    this.rebuildPlayGrants(state);
    return grantable;
  }

  restoreVerifiedPurchases(records:PurchaseRecord[],state:CommerceState){
    state.ledger.records={};
    for(const record of records)this.applyPlayPurchase(record,state);
  }

  equipCosmetic(cosmeticId:string,state:CommerceState){
    const cosmetic=this.cosmetics.get(cosmeticId);
    if(!cosmetic)throw new Error(`Unknown cosmetic: ${cosmeticId}`);
    if(!state.inventory.ownedCosmeticIds.includes(cosmeticId))throw new Error(`Cosmetic is not owned: ${cosmeticId}`);
    state.inventory.equippedBySlot[cosmetic.slot]=cosmeticId;
  }

  adRequestMode(state:CommerceState):'blocked'|'non-personalized'|'personalized'{
    if(state.consent==='obtained')return 'personalized';
    if(state.consent==='not-required')return 'non-personalized';
    return 'blocked';
  }

  grantRewardedAction(
    actionId:string,receiptId:string,state:CommerceState
  ):RewardedActionDefinition['reward']{
    if(this.adRequestMode(state)==='blocked')throw new Error('Rewarded ad is blocked until consent is resolved');
    if(state.rewardedReceiptIds.includes(receiptId))throw new Error(`Rewarded receipt already consumed: ${receiptId}`);
    const action=this.rewarded.get(actionId);
    if(!action)throw new Error(`Unknown rewarded action: ${actionId}`);
    state.rewardedReceiptIds.push(receiptId);
    return {...action.reward};
  }

  private requireProduct(id:string){
    const product=this.products.get(id);
    if(!product)throw new Error(`Unknown product: ${id}`);
    return product;
  }

  private hasGrant(grant:StoreProductDefinition['grants'][number],state:CommerceState){
    return grant.type==='entitlement'
      ?state.inventory.entitlements.includes(grant.id)
      :state.inventory.ownedCosmeticIds.includes(grant.id);
  }

  private applyGrants(product:StoreProductDefinition,state:CommerceState){
    for(const grant of product.grants){
      const list=grant.type==='entitlement'?state.inventory.entitlements:state.inventory.ownedCosmeticIds;
      if(!list.includes(grant.id))list.push(grant.id);
    }
  }

  private rebuildPlayGrants(state:CommerceState){
    const playProducts=[...this.products.values()].filter(product=>product.playProductId!==undefined);
    const paidEntitlements=new Set(playProducts.flatMap(product=>product.grants.filter(grant=>grant.type==='entitlement').map(grant=>grant.id)));
    const paidCosmetics=new Set(playProducts.flatMap(product=>product.grants.filter(grant=>grant.type==='cosmetic').map(grant=>grant.id)));
    state.inventory.entitlements=state.inventory.entitlements.filter(id=>!paidEntitlements.has(id));
    state.inventory.ownedCosmeticIds=state.inventory.ownedCosmeticIds.filter(id=>!paidCosmetics.has(id));
    for(const record of Object.values(state.ledger.records)){
      const active=(record.state==='verified'||record.state==='acknowledged')&&record.verification==='verified';
      if(!active)continue;
      const product=playProducts.find(item=>item.playProductId===record.productId);
      if(product)this.applyGrants(product,state);
    }
    const owned=new Set(state.inventory.ownedCosmeticIds);
    for(const [slot,equipped] of Object.entries(state.inventory.equippedBySlot)){
      if(!owned.has(equipped))delete state.inventory.equippedBySlot[slot as CosmeticSlot];
    }
  }
}
