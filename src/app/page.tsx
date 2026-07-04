import { ChapterTiny, Juz } from "@/types/quran";
import HomeClient from "@/components/HomeClient";
import chaptersTiny from "../../public/data/chapters-tiny.json";
import juzsData from "../../public/data/juzs.json";

export default async function Home() {
  const chapters = chaptersTiny as ChapterTiny[];
  const juzs = juzsData.juzs as Juz[];
  const alKahf = chapters.find((c) => c.id === 18);

  return (
    <HomeClient chapters={chapters} alKahf={alKahf} juzs={juzs} />
  );
}

