import React from 'react';

import './App.css';
import RecordNow from './components/RecordNow'

function App() {

  return (
    <div className="App" style={styles.fullScreen}>
      <RecordNow />
    </div>
  );
}

const styles = {
  fullScreen: {
    //display: 'grid',
    height: '100vh',
    alignContent: 'center',
    display: 'grid',
    gridTemplateRows: '285px calc(100vh - 285px)',
  }
}

export default App;
