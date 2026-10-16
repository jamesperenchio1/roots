begin;
-- buyer = Test Grower; pick an active listing not owned by them
create temp table _l as select id, seller_id, price_thb, shipping_cost_thb from public.listings where status='active' and seller_id <> 'b7a6b54c-ba35-493f-af55-10a03ad92016' and 'pickup' = any(delivery_options) limit 1;
grant select on _l to authenticated;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"b7a6b54c-ba35-493f-af55-10a03ad92016","role":"authenticated"}',true);
do $$
declare l record; tx public.transactions; ok boolean;
begin
  select * into l from _l;
  tx := public.create_order(l.id,'pickup',null,'direct');
  if tx.sale_price_thb <> round(l.price_thb) or tx.status <> 'pending_payment' or tx.seller_id <> l.seller_id then raise exception 'FAIL create_order values'; end if;
  if (select status from public.listings where id=l.id) <> 'sold' then raise exception 'FAIL listing not reserved'; end if;
  -- second buyer attempt must fail
  begin perform public.create_order(l.id,'pickup',null,'direct'); raise exception 'FAIL double order'; exception when raise_exception then if sqlerrm like 'FAIL%' then raise; end if; end;
  -- direct write must fail
  begin insert into public.transactions(listing_id,buyer_id,seller_id,sale_price_thb,platform_fee_thb,seller_payout_thb,status) values (l.id,'b7a6b54c-ba35-493f-af55-10a03ad92016',l.seller_id,1,0,1,'pending_payment'); raise exception 'FAIL direct insert allowed'; exception when insufficient_privilege then null; end;
  begin update public.transactions set status='completed' where id=tx.id; raise exception 'FAIL direct update allowed'; exception when insufficient_privilege then null; end;
  -- buyer pays, cannot ship, cancel after paid forbidden for buyer
  perform public.confirm_direct_payment(tx.id);
  begin perform public.order_action(tx.id,'ship','Kerry','X'); raise exception 'FAIL buyer shipped'; exception when raise_exception then if sqlerrm like 'FAIL%' then raise; end if; end;
  begin perform public.order_action(tx.id,'cancel'); raise exception 'FAIL buyer cancelled paid order'; exception when raise_exception then if sqlerrm like 'FAIL%' then raise; end if; end;
  raise notice 'ALL OK';
end $$;
rollback;
