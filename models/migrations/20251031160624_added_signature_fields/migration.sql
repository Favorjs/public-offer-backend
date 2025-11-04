/*
  Warnings:

  - You are about to drop the column `shares_apllied` on the `public_offers` table. All the data in the column will be lost.
  - You are about to drop the `bank_details` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `shares_applied` to the `public_offers` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `public_offers` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "ApplicationStatus" AS ENUM ('PENDING', 'SUBMITTED', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "public_offers" DROP COLUMN "shares_apllied",
ADD COLUMN     "corporate_signature" TEXT,
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "individual_signature" TEXT,
ADD COLUMN     "joint_signature" TEXT,
ADD COLUMN     "shares_applied" BIGINT NOT NULL,
ADD COLUMN     "status" "ApplicationStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "name" DROP NOT NULL,
ALTER COLUMN "designation" DROP NOT NULL,
ALTER COLUMN "second_name" DROP NOT NULL,
ALTER COLUMN "second_designation" DROP NOT NULL,
ALTER COLUMN "rc_number" DROP NOT NULL;

-- DropTable
DROP TABLE "public"."bank_details";
