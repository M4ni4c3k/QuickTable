import { useRouteError } from 'react-router-dom'

export default function ErrorPage() {
  const error = useRouteError()
  console.error(error)

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center p-8">
        <h1 className="text-4xl font-bold text-gray-800 mb-4">Ups! Coś poszło nie tak</h1>
        <p className="text-lg text-gray-600 mb-6">Strona, której szukasz, nie istnieje.</p>
        <a 
          href="/" 
          className="inline-block bg-blue-500 hover:bg-blue-600 text-white font-semibold px-6 py-3 rounded-lg transition-colors"
        >
          Wróć do strony głównej
        </a>
      </div>
    </div>
  )
}