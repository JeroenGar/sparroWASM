import styles from "../styles/Header.module.css";

interface HeaderProps {
  onHomeClick: () => void;
}

function Header({ onHomeClick }: HeaderProps) {
  return (
    <header className={styles.header}>
        <h1 className={styles.container} onClick={onHomeClick}>
          sparroWASM
        </h1>
        <p className={styles.subtitle}>
            Solve 2D nesting problems using <a href="https://github.com/JeroenGar/sparrow" target="_blank" rel="noopener noreferrer">sparrow</a> in the browser with WebAssembly!
        </p>
    </header>
  );
}

export default Header;
