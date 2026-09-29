import {test} from 'node:test';
import * as assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {CommerceService} from '../assets/scripts/commerce/CommerceService';
import {parseCommerce,serializeCommerce} from '../assets/scripts/commerce/CommerceCodec';
import {validateCommerceCatalog} from '../assets/scripts/commerce/CommerceValidator';
import {UnavailableBillingBridge} from '../assets/scripts/commerce/BillingBridge';
import type {
  CosmeticDefinition,PurchaseRecord,RewardedActionDefinition,StoreProductDefinition
} from '../assets/scripts/commerce/CommerceTypes';

type Catalog={products:StoreProductDefinition[];cosmetics:CosmeticDefinition[];rewardedActions:RewardedActionDefinition[]};
const catalog=JSON.parse(readFileSync(new URL('../assets/data/commerce-catalog.json',import.meta.url),'utf8')) as Catalog;
const service=new CommerceService(catalog.products,catalog.cosmetics,catalog.rewardedActions);
const purchase=(overrides:Partial<PurchaseRecord>={}):PurchaseRecord=>({
  purchaseToken:'token-1',productId:'metrova.remove_ads',state:'pending',verification:'unverified',
  acknowledged:false,updatedAtIso:'2026-09-29T00:00:00Z',source:'play-test',...overrides
});

test('catalog contains only cosmetic, remove-ads, and supporter grants',()=>{
  assert.deepEqual(validateCommerceCatalog(catalog.products,catalog.cosmetics,catalog.rewardedActions),[]);
  assert.equal(catalog.products.some(product=>product.grants.some(grant=>/skill|budget|star|continue/i.test(grant.id))),false);
});

test('Metro Coin market owns and equips cosmetics without touching Skill Points or level budget',()=>{
  const state=service.createState();
  const wallet={metroCoin:600};
  service.buyWithMetroCoin('coin-amber-comet',state,wallet);
  service.equipCosmetic('skin-amber-comet',state);
  assert.equal(wallet.metroCoin,300);
  assert.deepEqual(state.inventory.ownedCosmeticIds,['skin-amber-comet']);
  assert.equal(state.inventory.equippedBySlot['train-skin'],'skin-amber-comet');
  assert.throws(()=>service.buyWithMetroCoin('coin-amber-comet',state,wallet));
});

test('pending and unverified Play records never grant an entitlement',()=>{
  const state=service.createState();
  assert.equal(service.applyPlayPurchase(purchase(),state),false);
  assert.equal(service.applyPlayPurchase(purchase({state:'purchased-unverified'}),state),false);
  assert.deepEqual(state.inventory.entitlements,[]);
  assert.equal(state.ledger.records['token-1'].state,'purchased-unverified');
});

test('verified restore grants, while refund revokes, the exact product entitlement',()=>{
  const state=service.createState();
  service.restoreVerifiedPurchases([purchase({state:'acknowledged',verification:'verified',acknowledged:true})],state);
  assert.deepEqual(state.inventory.entitlements,['remove-ads']);
  service.applyPlayPurchase(purchase({state:'refunded',verification:'verified',acknowledged:true}),state);
  assert.deepEqual(state.inventory.entitlements,[]);
});

test('refunding one product keeps entitlements still backed by another verified purchase',()=>{
  const state=service.createState();
  service.applyPlayPurchase(purchase({purchaseToken:'remove-token',state:'acknowledged',verification:'verified',acknowledged:true}),state);
  service.applyPlayPurchase(purchase({purchaseToken:'supporter-token',productId:'metrova.supporter_pack',state:'acknowledged',verification:'verified',acknowledged:true}),state);
  service.applyPlayPurchase(purchase({purchaseToken:'supporter-token',productId:'metrova.supporter_pack',state:'refunded',verification:'verified',acknowledged:true}),state);
  assert.deepEqual(state.inventory.entitlements,['remove-ads']);
  assert.equal(state.inventory.ownedCosmeticIds.includes('badge-supporter'),false);
});

test('consent blocks rewarded requests and receipts are idempotent meta-only hooks',()=>{
  const state=service.createState();
  assert.equal(service.adRequestMode(state),'blocked');
  assert.throws(()=>service.grantRewardedAction('store-refresh','receipt-1',state));
  state.consent='not-required';
  assert.equal(service.adRequestMode(state),'non-personalized');
  assert.deepEqual(service.grantRewardedAction('store-refresh','receipt-1',state),{type:'store-refresh',amount:1});
  assert.throws(()=>service.grantRewardedAction('store-refresh','receipt-1',state));
});

test('commerce save prunes unknown cosmetics and preserves verified ledger state',()=>{
  const state=service.createState();
  state.inventory.ownedCosmeticIds=['skin-amber-comet','removed-cosmetic'];
  state.inventory.equippedBySlot['train-skin']='skin-amber-comet';
  state.inventory.entitlements=['remove-ads','unknown-entitlement'];
  state.ledger.records['token-1']=purchase({state:'acknowledged',verification:'verified',acknowledged:true});
  const restored=parseCommerce(serializeCommerce(state),catalog.products,catalog.cosmetics);
  assert.deepEqual(restored.inventory.ownedCosmeticIds,['skin-amber-comet']);
  assert.deepEqual(restored.inventory.entitlements,['remove-ads']);
  assert.equal(restored.ledger.records['token-1'].verification,'verified');
});

test('default billing boundary cannot fabricate a successful transaction',async()=>{
  const bridge=new UnavailableBillingBridge();
  assert.equal((await bridge.availability()).available,false);
  await assert.rejects(()=>bridge.beginPurchase('metrova.remove_ads'));
  assert.deepEqual(await bridge.restorePurchases(),[]);
});
