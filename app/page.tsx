import { MusicDirector } from "./music-director";
import { getChatGPTUser } from "./chatgpt-auth";

export const dynamic = "force-dynamic";

export default async function Home() {
  const user = await getChatGPTUser();
  return <MusicDirector viewer={{
    authenticated: Boolean(user),
    displayName: user?.displayName,
  }} />;
}
