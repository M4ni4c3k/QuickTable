export default function ClientsPage(){
    return (
    <main className="main-content">
      <section className="features">
        <h2>Kluczowe funkcje:</h2>
        <ul>
          <li>Mapa stolików w czasie rzeczywistym</li>
          <li>Samodzielne zamawianie przez klientów</li>
          
        </ul>
      </section>

      <div className="actions">
        <button className="btn primary">Panel kelnera</button>
        <button className="btn secondary">Zamów jako gość</button>
      </div>
    </main>
  )
}