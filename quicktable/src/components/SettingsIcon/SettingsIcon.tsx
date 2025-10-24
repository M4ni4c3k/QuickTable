import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './SettingsIcon.module.css';

interface SettingsIconProps {
  additionalOptions?: { label: string; onClick: () => void; className?: string }[];
}

export default function SettingsIcon({ additionalOptions }: SettingsIconProps) {
  const [showViewModal, setShowViewModal] = useState(false);
  const [showChangeViewModal, setShowChangeViewModal] = useState(false);
  const navigate = useNavigate();

  const handleNavigate = (path: string) => {
    setShowChangeViewModal(false);
    setShowViewModal(false);
    navigate(path);
  };

  return (
    <>
      <button
        className={styles.gearButton}
        onClick={() => setShowViewModal(true)}
        title="Ustawienia"
      >
        ⚙️
      </button>

      {showViewModal && (
        <div className={styles.modalOverlay} onClick={() => setShowViewModal(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3>Ustawienia</h3>
            <div className={styles.modalButtons}>
              <button onClick={() => setShowChangeViewModal(true)}>
                Zmień widok
              </button>
              {additionalOptions && additionalOptions.length > 0 && (
                <div className={styles.modalDivider}></div>
              )}
              {additionalOptions?.map((option, index) => (
                <button key={index} onClick={option.onClick} className={option.className}>
                  {option.label}
                </button>
              ))}
            </div>
            <button className={styles.closeButton} onClick={() => setShowViewModal(false)}>
              Zamknij
            </button>
          </div>
        </div>
      )}

      {showChangeViewModal && (
        <div className={styles.modalOverlay} onClick={() => setShowChangeViewModal(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3>Zmień widok</h3>
            <div className={styles.modalButtons}>
              <button onClick={() => handleNavigate('/admin')}>
                Panel Administracyjny
              </button>
              <button onClick={() => handleNavigate('/client')}>
                Strona Klienta
              </button>
              <button onClick={() => handleNavigate('/menu')}>
                Menu
              </button>
              <button onClick={() => handleNavigate('/order')}>
                Zamówienia
              </button>
              <button onClick={() => handleNavigate('/reservation')}>
                Rezerwacje
              </button>
              <button onClick={() => handleNavigate('/kitchen')}>
                Kuchnia
              </button>
              <button onClick={() => handleNavigate('/waiter')}>
                Kelner
              </button>
            </div>
            <button className={styles.closeButton} onClick={() => setShowChangeViewModal(false)}>
              Wróć
            </button>
          </div>
        </div>
      )}
    </>
  );
}

