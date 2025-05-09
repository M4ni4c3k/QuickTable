import { useRouteError } from 'react-router-dom'

export default function ErrorPage() {
  const error = useRouteError()
  console.error(error)

  return (
    <div className="error-page">
      <h1>Ups! Coś poszło nie tak</h1>
      <p>Strona, której szukasz, nie istnieje.</p>
    </div>
  )
}