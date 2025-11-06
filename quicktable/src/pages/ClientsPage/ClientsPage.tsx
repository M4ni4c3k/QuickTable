import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const mockMenu = [
  { name: 'Pizza Margherita', description: 'Tradycyjna pizza z serem i sosem pomidorowym.', price: 25 },
  { name: 'Spaghetti Bolognese', description: 'Makaron z sosem mięsnym i ziołami.', price: 30 },
  { name: 'Sałatka Cezar', description: 'Sałata z kurczakiem, parmezanem i sosem Cezar.', price: 22 },
];

export default function ClientsPage() {
  const navigate = useNavigate();
  const [view, setView] = useState<'start' | 'menu'>('start');

  if (view === 'menu') {
    return (
      <div className="w-full">
        <div className="bg-gradient-to-r from-primary to-blue-600 text-white p-8 rounded-xl shadow-lg mb-8">
          <h2 className="text-4xl font-bold">Menu</h2>
        </div>
        
        <ul className="space-y-4 mb-8">
          {mockMenu.map((item, index) => (
            <li key={index} className="bg-white rounded-xl shadow-md p-6 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 border border-gray-100">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-2xl font-bold text-gray-800 mb-2">{item.name}</h3>
                  <p className="text-gray-600">{item.description}</p>
                </div>
                <span className="text-2xl font-bold text-primary ml-4">{item.price} zł</span>
              </div>
            </li>
          ))}
        </ul>
        
        <div className="flex justify-center">
          <button 
            className="px-8 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-all duration-300 font-semibold shadow-md hover:shadow-lg"
            onClick={() => setView('start')}
          >
            ⬅ Wróć
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <section className="bg-gradient-to-br from-white to-gray-50 p-8 rounded-xl shadow-lg border border-gray-200 mb-8">
        <h2 className="text-4xl font-bold text-gray-800 mb-4 bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
          Witaj w naszej restauracji!
        </h2>
        <p className="text-lg text-gray-600 font-medium">Wybierz jedną z opcji:</p>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <button 
          className="px-8 py-6 bg-gradient-to-r from-primary to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all duration-300 font-semibold text-lg shadow-lg hover:shadow-xl transform hover:-translate-y-1"
          onClick={() => navigate('/order')}
        >
          <span className="text-3xl block mb-2">🍽️</span>
          Zamów
        </button>
        <button 
          className="px-8 py-6 bg-gradient-to-r from-secondary to-green-600 text-white rounded-xl hover:from-green-600 hover:to-green-700 transition-all duration-300 font-semibold text-lg shadow-lg hover:shadow-xl transform hover:-translate-y-1"
          onClick={() => navigate('/menu')}
        >
          <span className="text-3xl block mb-2">📋</span>
          Przeglądaj menu
        </button>
        <button 
          className="px-8 py-6 bg-gradient-to-r from-gray-200 to-gray-300 text-gray-800 rounded-xl hover:from-gray-300 hover:to-gray-400 transition-all duration-300 font-semibold text-lg shadow-lg hover:shadow-xl transform hover:-translate-y-1"
          onClick={() => navigate('/reservation')}
        >
          <span className="text-3xl block mb-2">📅</span>
          Zarezerwuj stolik
        </button>
      </div>
    </div>
  );
}
