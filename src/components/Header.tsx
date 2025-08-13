import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faHome } from "@fortawesome/free-solid-svg-icons";

import styles from "../styles/Header.module.css";

interface HeaderProps {
  onHomeClick: () => void;
}

function Header({ onHomeClick }: HeaderProps) {
  return (
    <header className={styles.header}>
      <div
        className={styles.container}
        style={{ justifyContent: "flex-start" }}
        onClick={onHomeClick}
      >
        <FontAwesomeIcon icon={faHome} size="2x" className={styles.icon} />
      </div>

      <div className={styles.container} onClick={onHomeClick}>
        <h1>sparroWASM</h1>
      </div>
    </header>
  );
}

export default Header;
