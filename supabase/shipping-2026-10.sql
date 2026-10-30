-- Shipping waybills through OTO (api/_oto.js): the order's shipment, written only by the server (service role).
-- { ref, otoId, weight, count, requestedAt, status, dcStatus, company, trackingNumber, trackingUrl, awbUrl, error, at }
-- The customer reads it with her own order (tracking number and link); nobody writes it from the browser.
alter table public.orders add column if not exists shipment jsonb;
