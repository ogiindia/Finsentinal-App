import './Chatbot.css';

const ExternalGlowButton = ({ serviceFlag, onActivate }) => {
  return (
    <button
      className={`external-button ${serviceFlag !== 'yes' ? 'glowing' : ''}`}
      onClick={onActivate}
    >
      Activate Chatbot
    </button>
  );
};

export default ExternalGlowButton;