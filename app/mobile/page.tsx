import { connection } from "next/server";
import MobileAppClient from "./MobileAppClient";

export default async function MobilePage() {
  await connection();

  return <MobileAppClient />;
}
