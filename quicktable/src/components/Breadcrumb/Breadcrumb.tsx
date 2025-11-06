import { useNavigate, useLocation } from 'react-router-dom';

interface BreadcrumbItem {
  label: string;
  path?: string;
  onClick?: () => void;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
}

export default function Breadcrumb({ items }: BreadcrumbProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const handleClick = (item: BreadcrumbItem) => {
    if (item.onClick) {
      item.onClick();
    } else if (item.path) {
      navigate(item.path);
    }
  };

  return (
    <nav className="mb-6 bg-white rounded-lg shadow-sm border border-gray-200 px-4 py-3" aria-label="Breadcrumb">
      <ol className="flex items-center space-x-2 text-sm">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          const isActive = item.path === location.pathname || isLast;

          return (
            <li key={index} className="flex items-center">
              {!isLast && (item.path || item.onClick) ? (
                <button
                  className="px-2 py-1 rounded-md text-primary hover:bg-primary hover:text-white transition-all duration-200 font-medium"
                  onClick={() => handleClick(item)}
                  type="button"
                >
                  {item.label}
                </button>
              ) : (
                <span className="px-2 py-1 text-gray-800 font-semibold">{item.label}</span>
              )}
              {!isLast && <span className="mx-2 text-gray-400">/</span>}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

