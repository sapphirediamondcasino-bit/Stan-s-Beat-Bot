import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Music, Server, Users, Clock, Play, Pause, SkipForward, Volume2, Headphones, Zap, Book, HelpCircle } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';
const API = `${BACKEND_URL}/api`;

const LandingPage = () => {
  const [stats, setStats] = useState({
    server_count: 0,
    user_count: 0,
    uptime: '0d 0h 0m',
    songs_played: 0
  });

  const [activeTab, setActiveTab] = useState('home');
  const [supportMessage, setSupportMessage] = useState('');

  useEffect(() => {
    fetchBotStats();
    const interval = setInterval(fetchBotStats, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchBotStats = async () => {
    try {
      const response = await axios.get(`${API}/bot-stats`);
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching bot stats:', error);
      // Set default stats if API fails
      setStats({
        server_count: 0,
        user_count: 0,
        uptime: '0d 0h 0m',
        songs_played: 0
      });
    }
  };

  const handleSupportSubmit = async (e) => {
    e.preventDefault();
    
    // Webhook URL for support notifications
    const webhookUrl = process.env.REACT_APP_SUPPORT_WEBHOOK_URL;
    
    if (!webhookUrl) {
      alert('Support system is being configured. Please join our Discord server for now!');
      return;
    }

    try {
      await axios.post(webhookUrl, {
        content: `**New Support Request**\n\n${supportMessage}`,
        embeds: [{
          title: '🎵 Stan\'s Beat Bot Support Request',
          description: supportMessage,
          color: 65489, // Cyan color
          timestamp: new Date().toISOString(),
          footer: {
            text: 'Stan\'s Beat Bot Support'
          }
        }]
      });
      
      alert('Support ticket submitted! Our team will respond via Discord soon.');
      setSupportMessage('');
    } catch (error) {
      console.error('Error submitting support request:', error);
      alert('Error submitting ticket. Please join our Discord server for direct support.');
    }
  };

  const inviteBotUrl = 'https://discord.com/oauth2/authorize?client_id=1049861443111112744&permissions=3206144&integration_type=0&scope=bot+applications.commands';

  const scrollToSection = (sectionId) => {
    setActiveTab(sectionId);
    setTimeout(() => {
      document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  return (
    <div className="landing-page">
      {/* Header */}
      <header className="dark-header">
        <div className="header-content">
          <div className="logo-section">
            <Music className="logo-icon" size={32} />
            <h1 className="logo-text">Stans Beat Bot</h1>
          </div>
          <nav className="dark-nav">
            <a href="#home" onClick={() => scrollToSection('home')} className="dark-nav-link">Home</a>
            <a href="#features" onClick={() => scrollToSection('features')} className="dark-nav-link">Features</a>
            <a href="#commands" onClick={() => scrollToSection('commands')} className="dark-nav-link">Commands</a>
            <a href="#premium" onClick={() => scrollToSection('premium')} className="dark-nav-link">Premium</a>
            <a href="#characters" onClick={() => scrollToSection('characters')} className="dark-nav-link">Meet The Gang</a>
            <a href="#docs" onClick={() => scrollToSection('docs')} className="dark-nav-link">Documentation</a>
            <a href="#help" onClick={() => scrollToSection('help')} className="dark-nav-link">Help</a>
            <a href={inviteBotUrl} target="_blank" rel="noopener noreferrer" className="btn-primary">
              Invite Bot
            </a>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section id="home" className="hero-section">
        <div className="hero-content">
          <div className="hero-text">
            <h1 className="display-huge">The Ultimate American Dad Music Experience</h1>
            <p className="body-large">Bring Stan, Roger, and the gang to your Discord server with premium music streaming powered by American Dad vibes.</p>
            <div className="hero-buttons">
              <a href={inviteBotUrl} target="_blank" rel="noopener noreferrer" className="btn-primary">
                Add to Discord
              </a>
              <a href="#premium" onClick={() => scrollToSection('premium')} className="btn-secondary">
                Go Premium
              </a>
            </div>
            
            {/* Live Stats */}
            <div className="stats-grid">
              <div className="stat-card">
                <Server size={24} />
                <div className="stat-info">
                  <span className="stat-number">{stats.server_count}</span>
                  <span className="stat-label">Servers</span>
                </div>
              </div>
              <div className="stat-card">
                <Users size={24} />
                <div className="stat-info">
                  <span className="stat-number">{stats.user_count}</span>
                  <span className="stat-label">Users</span>
                </div>
              </div>
              <div className="stat-card">
                <Clock size={24} />
                <div className="stat-info">
                  <span className="stat-number">{stats.uptime}</span>
                  <span className="stat-label">Uptime</span>
                </div>
              </div>
              <div className="stat-card">
                <Headphones size={24} />
                <div className="stat-info">
                  <span className="stat-number">{stats.songs_played}</span>
                  <span className="stat-label">Songs Played</span>
                </div>
              </div>
            </div>
          </div>
          <div className="hero-image">
            <img src="/assets/hero-banner.png" alt="Stans Beat Bot" className="hero-img" />
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="features-section">
        <h2 className="display-large section-title">Features That Rock</h2>
        <div className="features-grid">
          <div className="feature-card">
            <Music size={32} />
            <h3 className="heading-2">High-Quality Streaming</h3>
            <p className="body-medium">Crystal clear audio streaming directly to your Discord voice channels.</p>
          </div>
          <div className="feature-card">
            <Play size={32} />
            <h3 className="heading-2">Easy Playback Controls</h3>
            <p className="body-medium">Play, pause, skip, and control volume with simple slash commands.</p>
          </div>
          <div className="feature-card">
            <Zap size={32} />
            <h3 className="heading-2">Lightning Fast</h3>
            <p className="body-medium">Instant response times and minimal latency for smooth music experience.</p>
          </div>
          <div className="feature-card">
            <Volume2 size={32} />
            <h3 className="heading-2">Queue Management</h3>
            <p className="body-medium">Build and manage your music queue with ease. Never miss a beat.</p>
          </div>
        </div>
      </section>

      {/* Commands Section */}
      <section id="commands" className="commands-section">
        <h2 className="display-large section-title">Essential Commands</h2>
        <div className="commands-grid">
          <div className="command-card">
            <code className="command-code">/play [song]</code>
            <p className="body-small">Play a song or add it to the queue</p>
          </div>
          <div className="command-card">
            <code className="command-code">/pause</code>
            <p className="body-small">Pause the current track</p>
          </div>
          <div className="command-card">
            <code className="command-code">/resume</code>
            <p className="body-small">Resume playback</p>
          </div>
          <div className="command-card">
            <code className="command-code">/skip</code>
            <p className="body-small">Skip to the next song</p>
          </div>
          <div className="command-card">
            <code className="command-code">/queue</code>
            <p className="body-small">View the current queue</p>
          </div>
          <div className="command-card">
            <code className="command-code">/volume [0-100]</code>
            <p className="body-small">Adjust playback volume</p>
          </div>
          <div className="command-card">
            <code className="command-code">/nowplaying</code>
            <p className="body-small">See what's currently playing</p>
          </div>
          <div className="command-card">
            <code className="command-code">/shuffle</code>
            <p className="body-small">Shuffle the queue</p>
          </div>
          <div className="command-card">
            <code className="command-code">/loop</code>
            <p className="body-small">Loop current song or queue</p>
          </div>
          <div className="command-card">
            <code className="command-code">/stop</code>
            <p className="body-small">Stop playback and clear queue</p>
          </div>
          <div className="command-card">
            <code className="command-code">/lyrics</code>
            <p className="body-small">Get lyrics for current song</p>
          </div>
          <div className="command-card">
            <code className="command-code">/seek [time]</code>
            <p className="body-small">Jump to specific time in song</p>
          </div>
        </div>
      </section>

      {/* Premium Section */}
      <section id="premium" className="premium-section">
        <h2 className="display-large section-title">Go Premium</h2>
        <p className="body-large section-subtitle">Unlock exclusive features and support development</p>
        
        <div className="premium-features">
          <div className="premium-feature">✓ No Ads</div>
          <div className="premium-feature">✓ Custom Volume Control</div>
          <div className="premium-feature">✓ Priority Queue</div>
          <div className="premium-feature">✓ Advanced Filters</div>
          <div className="premium-feature">✓ Unlimited Playlists</div>
          <div className="premium-feature">✓ AI Playlist Builder (Coming Soon)</div>
        </div>

        <div className="pricing-grid">
          <div className="pricing-card">
            <h3 className="heading-2">1 Month</h3>
            <div className="price">$4.99<span className="price-period">/mo</span></div>
            <p className="body-small free-trial">7-Day Free Trial</p>
            <button className="btn-primary" style={{width: '100%', marginTop: '20px'}}>Subscribe</button>
          </div>
          
          <div className="pricing-card">
            <h3 className="heading-2">3 Months</h3>
            <div className="price">$12.99<span className="price-period">/3mo</span></div>
            <p className="body-small savings">Save 13%</p>
            <button className="btn-primary" style={{width: '100%', marginTop: '20px'}}>Subscribe</button>
          </div>
          
          <div className="pricing-card popular">
            <div className="popular-badge">Most Popular</div>
            <h3 className="heading-2">6 Months</h3>
            <div className="price">$24.99<span className="price-period">/6mo</span></div>
            <p className="body-small savings">Save 17%</p>
            <button className="btn-primary" style={{width: '100%', marginTop: '20px'}}>Subscribe</button>
          </div>
          
          <div className="pricing-card">
            <h3 className="heading-2">1 Year</h3>
            <div className="price">$44.99<span className="price-period">/yr</span></div>
            <p className="body-small savings">Save 25%</p>
            <button className="btn-primary" style={{width: '100%', marginTop: '20px'}}>Subscribe</button>
          </div>
        </div>

        <div className="paypal-setup-info">
          <h3 className="heading-3">PayPal Integration Instructions</h3>
          <div className="setup-instructions">
            <p className="body-medium">For developers setting up subscriptions:</p>
            <ol className="body-small">
              <li>Create subscription plans in your PayPal Business account</li>
              <li>Add PayPal SDK script to <code>public/index.html</code></li>
              <li>Replace buttons above with PayPal button containers</li>
              <li>Initialize buttons with your Plan IDs in useEffect</li>
              <li>On approval, send subscription data to <code>/api/premium/subscribe</code></li>
            </ol>
            <pre className="code-block">
{`// Example PayPal SDK Script
<script src="https://www.paypal.com/sdk/js?client-id=YOUR_CLIENT_ID&vault=true&intent=subscription"></script>`}
            </pre>
          </div>
        </div>
      </section>

      {/* Characters Section */}
      <section id="characters" className="characters-section">
        <h2 className="display-large section-title">Meet The Gang</h2>
        <div className="characters-grid">
          <div className="character-card">
            <img src="/assets/stan.png" alt="Stan Smith" className="character-img" onError={(e) => e.target.style.display = 'none'} />
            <div className="speech-bubble">
              <p>"This bot is more patriotic than apple pie! Add it to your server, that's an order!"</p>
            </div>
            <h3 className="heading-3">Stan Smith</h3>
            <p className="body-small">CIA Agent & Bot Commander</p>
          </div>
          
          <div className="character-card">
            <img src="/assets/roger.png" alt="Roger" className="character-img" onError={(e) => e.target.style.display = 'none'} />
            <div className="speech-bubble">
              <p>"I've DJ'd at better parties than this, but this bot? *Chef's kiss* Perfection!"</p>
            </div>
            <h3 className="heading-3">Roger</h3>
            <p className="body-small">Alien & Music Connoisseur</p>
          </div>
          
          <div className="character-card">
            <img src="/assets/francine.png" alt="Francine Smith" className="character-img" onError={(e) => e.target.style.display = 'none'} />
            <div className="speech-bubble">
              <p>"Finally, a bot that plays my favorite tunes! Stan, invite this to all your CIA servers!"</p>
            </div>
            <h3 className="heading-3">Francine Smith</h3>
            <p className="body-small">Housewife & Party Enthusiast</p>
          </div>

          <div className="character-card">
            <img src="/assets/klaus.png" alt="Klaus" className="character-img" onError={(e) => e.target.style.display = 'none'} />
            <div className="speech-bubble">
              <p>"Ja! Even though I'm stuck in this fish bowl, this bot brings ze music to my fins!"</p>
            </div>
            <h3 className="heading-3">Klaus</h3>
            <p className="body-small">German Goldfish & Music Lover</p>
          </div>
        </div>
      </section>

      {/* Documentation Section */}
      <section id="docs" className="docs-section">
        <h2 className="display-large section-title">📚 Documentation</h2>
        <div className="docs-container">
          <div className="doc-section">
            <Book size={32} className="doc-icon" />
            <h3 className="heading-2">Getting Started</h3>
            <p className="body-medium">Welcome to Stan's Beat Bot! Here's everything you need to know to get your server rocking.</p>
            <ul className="doc-list">
              <li>Click the "Invite Bot" button and select your Discord server</li>
              <li>Grant the bot necessary permissions (Voice Channel access, Send Messages)</li>
              <li>Join a voice channel and use <code>/play [song name]</code> to start</li>
              <li>Use <code>/help</code> to see all available commands</li>
            </ul>
          </div>

          <div className="doc-section">
            <h3 className="heading-2">Basic Usage</h3>
            <p className="body-medium"><strong>Playing Music:</strong></p>
            <ul className="doc-list">
              <li><code>/play [song name or URL]</code> - Plays a song or adds it to queue</li>
              <li><code>/pause</code> - Pauses current playback</li>
              <li><code>/resume</code> - Resumes paused playback</li>
              <li><code>/skip</code> - Skips to next song in queue</li>
              <li><code>/stop</code> - Stops playback and clears queue</li>
            </ul>
          </div>

          <div className="doc-section">
            <h3 className="heading-2">Queue Management</h3>
            <ul className="doc-list">
              <li><code>/queue</code> - View the current music queue</li>
              <li><code>/shuffle</code> - Shuffle the queue randomly</li>
              <li><code>/loop [song/queue/off]</code> - Loop current song or entire queue</li>
              <li><code>/remove [position]</code> - Remove a song from queue</li>
              <li><code>/clear</code> - Clear the entire queue</li>
            </ul>
          </div>

          <div className="doc-section">
            <h3 className="heading-2">Advanced Features</h3>
            <ul className="doc-list">
              <li><code>/volume [0-100]</code> - Adjust playback volume</li>
              <li><code>/seek [time]</code> - Jump to specific timestamp (e.g., 1:30)</li>
              <li><code>/lyrics</code> - Get lyrics for currently playing song</li>
              <li><code>/nowplaying</code> - See detailed info about current song</li>
              <li><code>/filter [bass/nightcore/vaporwave]</code> - Apply audio filters (Premium)</li>
            </ul>
          </div>

          <div className="doc-section">
            <h3 className="heading-2">Troubleshooting</h3>
            <p className="body-medium">Common issues and solutions:</p>
            <ul className="doc-list">
              <li><strong>Bot not playing audio?</strong> Make sure you're in a voice channel and the bot has voice permissions</li>
              <li><strong>Commands not working?</strong> Ensure you're using slash commands (/) and bot is online</li>
              <li><strong>Poor audio quality?</strong> Check your Discord voice settings and server region</li>
              <li><strong>Bot disconnects randomly?</strong> May be due to inactivity timeout (10 minutes default)</li>
            </ul>
          </div>

          <div className="doc-section">
            <h3 className="heading-2">Premium Benefits</h3>
            <p className="body-medium">Upgrade to Premium for:</p>
            <ul className="doc-list">
              <li>No advertisements or cooldowns</li>
              <li>Higher quality audio streaming</li>
              <li>Custom audio filters and effects</li>
              <li>Priority queue and skip voting</li>
              <li>Unlimited saved playlists</li>
              <li>24/7 music mode (bot stays in channel)</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Help Section */}
      <section id="help" className="help-section">
        <h2 className="display-large section-title">🎧 Need Help?</h2>
        <div className="help-container">
          <div className="help-intro">
            <HelpCircle size={48} className="help-icon" />
            <p className="body-large">Can't find what you're looking for? Submit a support ticket and our team will get back to you!</p>
          </div>

          <div className="troubleshoot-grid">
            <div className="troubleshoot-card">
              <h3 className="heading-3">Bot Not Responding?</h3>
              <p className="body-medium">Make sure the bot has proper permissions in your server and is online. Check the status dashboard above.</p>
            </div>
            <div className="troubleshoot-card">
              <h3 className="heading-3">Audio Issues?</h3>
              <p className="body-medium">Check your voice channel permissions and bot volume settings. Try using <code>/volume 50</code> to reset.</p>
            </div>
            <div className="troubleshoot-card">
              <h3 className="heading-3">Commands Not Working?</h3>
              <p className="body-medium">Ensure you're using slash commands (/) and the bot is in your voice channel. Try <code>/help</code> first.</p>
            </div>
          </div>

          <div className="support-form-container">
            <h3 className="heading-3">Submit Support Ticket</h3>
            <form onSubmit={handleSupportSubmit} className="support-form">
              <textarea
                className="support-textarea"
                placeholder="Describe your issue or question..."
                value={supportMessage}
                onChange={(e) => setSupportMessage(e.target.value)}
                required
                rows={6}
              />
              <button type="submit" className="btn-primary" style={{width: '100%'}}>
                Submit Ticket
              </button>
              <p className="body-small" style={{marginTop: '12px', textAlign: 'center', color: 'var(--text-muted)'}}>
                Tickets are sent to our Discord support team. You can also join our <a href="#" className="support-link">Discord server</a> for live help.
              </p>
            </form>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="footer-content">
          <div className="footer-section">
            <h3 className="heading-3">Stans Beat Bot</h3>
            <p className="body-small">The ultimate American Dad music bot for Discord</p>
            <p className="body-small" style={{marginTop: '12px'}}>Bringing the Smith family vibes to your server since 2024</p>
          </div>
          
          <div className="footer-section">
            <h4 className="heading-3">Quick Links</h4>
            <nav className="footer-nav">
              <a href="#features" onClick={() => scrollToSection('features')} className="footer-link">Features</a>
              <a href="#commands" onClick={() => scrollToSection('commands')} className="footer-link">Commands</a>
              <a href="#premium" onClick={() => scrollToSection('premium')} className="footer-link">Premium</a>
              <a href="#characters" onClick={() => scrollToSection('characters')} className="footer-link">Meet The Gang</a>
              <a href="#docs" onClick={() => scrollToSection('docs')} className="footer-link">Documentation</a>
              <a href={inviteBotUrl} target="_blank" rel="noopener noreferrer" className="footer-link">Invite Bot</a>
            </nav>
          </div>
          
          <div className="footer-section">
            <h4 className="heading-3">Developer Info</h4>
            <p className="body-small">API Endpoint for premium verification:</p>
            <code className="footer-code">GET /api/premium/verify/:userId</code>
            <p className="body-small" style={{marginTop: '12px'}}>Bot Integration Guide available in Documentation</p>
          </div>
        </div>
        
        <div className="footer-bottom">
          <p className="body-small">© 2025 Stans Beat Bot. All rights reserved. Not affiliated with American Dad or Fox Broadcasting.</p>
          <p className="body-small" style={{marginTop: '8px'}}>Made with 🎵 by the Sapphire Diamond Casino team</p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
