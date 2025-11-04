-- CreateEnum
CREATE TYPE "Title" AS ENUM ('MR', 'MRS', 'MISS', 'OTHERS');

-- CreateEnum
CREATE TYPE "AccountType" AS ENUM ('INDIVIDUAL', 'CORPORATE', 'JOINT');

-- CreateTable
CREATE TABLE "admin_users" (
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "public_offers" (
    "id" SERIAL NOT NULL,
    "shares_apllied" BIGINT NOT NULL,
    "amount_payable" BIGINT NOT NULL,
    "account_type" "AccountType" NOT NULL,
    "title" "Title" NOT NULL,
    "surname" TEXT NOT NULL,
    "first_name" TEXT NOT NULL,
    "other_names" TEXT,
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "country" TEXT NOT NULL DEFAULT 'Nigeria',
    "phone" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "dob" TIMESTAMP(3) NOT NULL,
    "next_of_kin" TEXT NOT NULL,
    "contact_person" TEXT NOT NULL,
    "chn" TEXT NOT NULL,
    "cscs_no" TEXT NOT NULL,
    "stockbrokers_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "designation" TEXT NOT NULL,
    "second_name" TEXT NOT NULL,
    "second_designation" TEXT NOT NULL,
    "rc_number" TEXT NOT NULL,

    CONSTRAINT "public_offers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stockbrokers" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,

    CONSTRAINT "stockbrokers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bank_details" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "bvn" TEXT NOT NULL,
    "second_bvn" TEXT NOT NULL,
    "bank_name" TEXT NOT NULL,
    "state" TEXT NOT NULL,

    CONSTRAINT "bank_details_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "admin_users_email_key" ON "admin_users"("email");

-- AddForeignKey
ALTER TABLE "public_offers" ADD CONSTRAINT "public_offers_stockbrokers_id_fkey" FOREIGN KEY ("stockbrokers_id") REFERENCES "stockbrokers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
