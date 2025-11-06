export default function Footer() {
  return (
    <footer className="bg-gradient-to-r from-gray-800 via-gray-700 to-gray-800 text-white border-t-4 border-primary shadow-lg mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="text-center">
          <p className="text-sm font-medium text-gray-300">
            © {new Date().getFullYear()} QuickTable System. Wszystkie prawa zastrzeżone.
          </p>
        </div>
      </div>
    </footer>
  )
}