import React from 'react';
import ReactDOM from 'react-dom';

import Tab from './tab';

class Popup extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      tabs: undefined,
      selectedTab: 0,
    };

    window.addEventListener('unload', this.onWindowUnload);
  }

  componentDidMount() {
    console.log('popup: componentDidMount()');

    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (!message.popup) {
        return;
      }
      console.log('Popup: got message:', message);
      switch (message.action) {
        case 'tabListChanged':
          return sendResponse(this.onTabListChanged(message));
        default:
          throw new Error(
            `Popup got an unexpected action: ${message.action}`);
      }
      return true;
    });

    this.sendToBackground({action: 'openPopup'})
      .then(() => {
        this.getTabs();
      });

    setTimeout(() => {
      console.log('focusing to get key events!');
      // The focus is a Firefox workaround for:
      // https://bugzilla.mozilla.org/show_bug.cgi?id=1324255
      document.querySelector('body').focus();
    }, 100);
    document.addEventListener('keydown', this.onKeyDown, false);
  }

  componentWillUnmount() {
    console.log('popup: componentWillUnmount');
    this.sendToBackground({
      action: 'closePopup',
    });

    document.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('unload', this.onWindowUnload);
  }

  onWindowUnload = () => {
    console.log('popup: onWindowUnload');
    this.componentWillUnmount();
  }

  sendToBackground(message) {
    const id = undefined;
    const options = undefined;
    return new Promise((resolve) => {
      chrome.runtime.sendMessage(
        id,
        {
          background: true,
          ...message,
        },
        options,
        (result) => {
          if (chrome.runtime.lastError) {
            console.log(
              'popup: ignoring sendMessage error:',
              chrome.runtime.lastError);
          } else {
            resolve(result);
          }
        }
      );
    });
  }

  onKeyDown = (event) => {
    const {selectedTab, tabs} = this.state;
    let newSelectedTab;

    if (event.key === 'ArrowUp') {
      newSelectedTab = selectedTab - 1;
    } else if (event.key === 'ArrowDown') {
      newSelectedTab = selectedTab + 1;
    } else {
      return;
    }

    if (newSelectedTab >= tabs.length) {
      newSelectedTab = tabs.length - 1; // last one
    } else if (newSelectedTab < 0) {
      newSelectedTab = 0; // first one
    }
    console.log('Changing selected tab to', newSelectedTab);
    this.setState({selectedTab: newSelectedTab});
  }

  onTabListChanged = (message) => {
    const {tabs} = message.data;
    console.log(`popup: onTabListChanged:`, tabs);
    this.setState({tabs});
  }

  getTabs = () => {
    console.log('popup: getTabs');
    this.sendToBackground({action: 'getTabs'})
      .then(tabs => {
        console.log('popup: got response to getTabs', tabs);
        this.setState({tabs});
      });
  }

  render() {
    const {tabs, selectedTab} = this.state;
    let items = tabs;
    if (items === undefined) {
      items = [
        <div className="no-sounds">
          Loading...
        </div>
      ];
    } else if (!items.length) {
      items.push(
        <div className="no-sounds">
          There are currently no websites playing sound
        </div>
      );
    } else {
      const useSelectedStyle = tabs.length > 1;
      items = items.map((tab, index) => {
        const selected = index === selectedTab;
        return (
          <Tab tab={tab}
            selected={selected} useSelectedStyle={useSelectedStyle} />
        );
      });
    }

    return (
      <ul>
        {items.map(item => <li>{item}</li>)}
      </ul>
    );
  }
}

ReactDOM.render(<Popup/>, document.getElementById('app'));
