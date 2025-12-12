-- Add evidence of payment upload fields
ALTER TABLE "public_offers"
ADD COLUMN "payment_receipt" TEXT,
ADD COLUMN "payment_receipt_filename" VARCHAR(255),
ADD COLUMN "payment_receipt_mime" VARCHAR(100);


