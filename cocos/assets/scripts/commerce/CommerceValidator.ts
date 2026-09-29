import type {CosmeticDefinition,RewardedActionDefinition,StoreProductDefinition} from './CommerceTypes';

const forbidden=/coin|skill|budget|star|continue|result/i;

export function validateCommerceCatalog(
  products:StoreProductDefinition[],cosmetics:CosmeticDefinition[],rewarded:RewardedActionDefinition[]
){
  const errors:string[]=[];
  const cosmeticIds=new Set(cosmetics.map(cosmetic=>cosmetic.id));
  const productIds=new Set<string>();
  for(const product of products){
    if(productIds.has(product.id))errors.push(`Duplicate product: ${product.id}`);
    productIds.add(product.id);
    if(product.kind==='coin-cosmetic'&&(product.coinPrice===undefined||product.playProductId!==undefined))errors.push(`${product.id} has invalid Coin product fields`);
    if(product.kind!=='coin-cosmetic'&&!product.playProductId)errors.push(`${product.id} requires a Play product id`);
    for(const grant of product.grants){
      if(grant.type==='cosmetic'&&!cosmeticIds.has(grant.id))errors.push(`${product.id} grants unknown cosmetic ${grant.id}`);
      if(forbidden.test(grant.id))errors.push(`${product.id} contains forbidden progression grant ${grant.id}`);
    }
  }
  for(const action of rewarded){
    if(action.placement!=='store')errors.push(`${action.id} must remain a meta store placement`);
    if(action.reward.type==='cosmetic-preview'&&!action.reward.cosmeticId)errors.push(`${action.id} preview requires a cosmetic id`);
  }
  return errors;
}
