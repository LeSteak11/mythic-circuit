import { NavLink, Route, Routes } from 'react-router-dom';
import styles from './App.module.css';
import HomeScreen from './screens/HomeScreen';
import CollectionScreen from './screens/CollectionScreen';
import CircuitBuilderScreen from './screens/CircuitBuilderScreen';
import BattleScreen from './screens/BattleScreen';
import PacksScreen from './screens/PacksScreen';
import SettingsScreen from './screens/SettingsScreen';

const navItems = [
  { to: '/', label: 'Home', end: true },
  { to: '/collection', label: 'Collection', end: false },
  { to: '/circuit', label: 'Circuit Builder', end: false },
  { to: '/battle', label: 'Battle', end: false },
  { to: '/packs', label: 'Packs', end: false },
  { to: '/settings', label: 'Settings', end: false },
];

export default function App() {
  return (
    <>
      <header className={styles.header}>
        <h1 className={styles.title}>Mythic Circuit</h1>
        <nav className={styles.nav} aria-label="Main navigation">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                isActive ? `${styles.navLink} ${styles.navLinkActive}` : styles.navLink
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </header>
      <main className={styles.main}>
        <Routes>
          <Route path="/" element={<HomeScreen />} />
          <Route path="/collection" element={<CollectionScreen />} />
          <Route path="/circuit" element={<CircuitBuilderScreen />} />
          <Route path="/battle" element={<BattleScreen />} />
          <Route path="/packs" element={<PacksScreen />} />
          <Route path="/settings" element={<SettingsScreen />} />
        </Routes>
      </main>
    </>
  );
}
