
import type { Ad } from "../types";

export function HomePage({ ads }: { ads: Ad[] }) {
  return (
    <div className="home-page p-8">
      <h1 className="text-3xl font-bold mb-4">Добро пожаловать в aqsha</h1>
      <p className="mb-8">Сайт для студентов, чтобы находить работу и услуги внутри университета.</p>
      
      <h2 className="text-2xl font-semibold mb-4">Последние объявления</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {ads.map((ad) => (
          <div key={ad.id} className="border p-4 rounded-lg shadow-sm bg-white dark:bg-zinc-800">
            <h3 className="font-medium text-lg">{ad.title}</h3>
            <p className="text-gray-500 whitespace-pre-wrap truncate">{ad.description}</p>
            <p className="mt-2 font-bold">{ad.price} ₸</p>
          </div>
        ))}
        {ads.length === 0 && <p>Пока нет объявлений.</p>}
      </div>
    </div>
  );
}
