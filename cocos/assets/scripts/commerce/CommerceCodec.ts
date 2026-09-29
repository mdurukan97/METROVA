import type {CommerceState,ConsentState,CosmeticDefinition,PurchaseRecord,StoreProductDefinition} from './CommerceTypes';

const consentStates=new Set<ConsentState>(['unknown','required','obtained','not-required','denied']);

export function serializeCommerce(state:CommerceState){return JSON.stringify(state);}

export function parseCommerce(source:string,products:StoreProductDefinition[],cosmetics:CosmeticDefinition[]):CommerceState{
  const value:unknown=JSON.parse(source);
  if(!record(value)||value.schemaVersion!==1||!record(value.inventory)||!record(value.ledger))throw new Error('Invalid commerce save');
  const cosmeticIds=new Set(cosmetics.map(item=>item.id));
  const entitlementIds=new Set(products.flatMap(product=>product.grants.filter(grant=>grant.type==='entitlement').map(grant=>grant.id)));
  const owned=strings(value.inventory.ownedCosmeticIds).filter(id=>cosmeticIds.has(id));
  const ownedSet=new Set(owned);
  const equipped:CommerceState['inventory']['equippedBySlot']={};
  if(record(value.inventory.equippedBySlot))for(const [slot,id] of Object.entries(value.inventory.equippedBySlot)){
    if(typeof id==='string'&&ownedSet.has(id))equipped[slot as keyof typeof equipped]=id;
  }
  const entitlements=strings(value.inventory.entitlements).filter(id=>entitlementIds.has(id));
  const records:Record<string,PurchaseRecord>={};
  if(record(value.ledger.records))for(const [token,item] of Object.entries(value.ledger.records)){
    if(validPurchase(item))records[token]=item;
  }
  const consent=typeof value.consent==='string'&&consentStates.has(value.consent as ConsentState)?value.consent as ConsentState:'unknown';
  return {schemaVersion:1,inventory:{ownedCosmeticIds:owned,equippedBySlot:equipped,entitlements},ledger:{records},consent,rewardedReceiptIds:strings(value.rewardedReceiptIds)};
}

function record(value:unknown):value is Record<string,unknown>{return typeof value==='object'&&value!==null&&!Array.isArray(value);}
function strings(value:unknown){return Array.isArray(value)?value.filter((item):item is string=>typeof item==='string'):[];}
function validPurchase(value:unknown):value is PurchaseRecord{
  if(!record(value))return false;
  return typeof value.purchaseToken==='string'&&typeof value.productId==='string'&&typeof value.state==='string'&&
    (value.verification==='verified'||value.verification==='unverified')&&typeof value.acknowledged==='boolean'&&
    typeof value.updatedAtIso==='string'&&(value.source==='play'||value.source==='play-test');
}
