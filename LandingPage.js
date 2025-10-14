import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Music, Server, Users, Clock, Play, Pause, SkipForward, Volume2, Headphones, Zap } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const LandingPage = () => {
  const [stats, setStats] = useState({
    server_count: 0,
    user_count: 0,
    uptime: '0d 0h 0m',
    songs_played: 0
  });

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
    }
  };

  const inviteBotUrl = 'https://discord.com/oauth2/authorize?client_id=1049861443111112744&permissions=3206144&integration_type=0&scope=bot+applications.commands';

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
            <a href="#features" className="dark-nav-link">Features</a>
            <a href="#commands" className="dark-nav-link">Commands</a>
            <a href="#premium" className="dark-nav-link">Premium</a>
            <a href="#characters" className="dark-nav-link">Characters</a>
            <a href={inviteBotUrl} target="_blank" rel="noopener noreferrer" className="btn-primary">
              Invite Bot
            </a>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-content">
          <div className="hero-text">
            <h1 className="display-huge">The Ultimate American Dad Music Experience</h1>
            <p className="body-large">Bring Stan, Roger, and the gang to your Discord server with premium music streaming powered by American Dad vibes.</p>
            <div className="hero-buttons">
              <a href={inviteBotUrl} target="_blank" rel="noopener noreferrer" className="btn-primary">
                Add to Discord
              </a>
              <a href="#premium" className="btn-secondary">
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
            <div id="paypal-button-1month"></div>
          </div>
          
          <div className="pricing-card">
            <h3 className="heading-2">3 Months</h3>
            <div className="price">$12.99<span className="price-period">/3mo</span></div>
            <p className="body-small savings">Save 13%</p>
            <div id="paypal-button-3month"></div>
          </div>
          
          <div className="pricing-card popular">
            <div className="popular-badge">Most Popular</div>
            <h3 className="heading-2">6 Months</h3>
            <div className="price">$24.99<span className="price-period">/6mo</span></div>
            <p className="body-small savings">Save 17%</p>
            <div id="paypal-button-6month"></div>
          </div>
          
          <div className="pricing-card">
            <h3 className="heading-2">1 Year</h3>
            <div className="price">$44.99<span className="price-period">/yr</span></div>
            <p className="body-small savings">Save 25%</p>
            <div id="paypal-button-1year"></div>
          </div>
        </div>

        <div className="paypal-setup-info">
          <h3 className="heading-3">PayPal Integration Setup</h3>
          <div className="setup-instructions">
            <p className="body-medium">To enable PayPal subscriptions:</p>
            <ol className="body-small">
              <li>Create subscription plans in your PayPal Business account</li>
              <li>Add PayPal SDK script to <code>public/index.html</code>:</li>
              <pre className="code-block">
{`<script src="https://www.paypal.com/sdk/js?client-id=YOUR_CLIENT_ID&vault=true&intent=subscription"></script>`}
              </pre>
              <li>Initialize PayPal buttons in componentDidMount or useEffect</li>
              <li>On successful subscription, call <code>/api/premium/subscribe</code> endpoint</li>
              <li>Store subscription ID and Discord user info in database</li>
            </ol>
          </div>
        </div>
      </section>

      {/* Troubleshoot Section */}
      <section id="troubleshoot" className="troubleshoot-section">
        <h2 className="display-large section-title">Need Help?</h2>
        <div className="troubleshoot-grid">
          <div className="troubleshoot-card">
            <h3 className="heading-3">Bot Not Responding?</h3>
            <p className="body-medium">Make sure the bot has proper permissions in your server and is online.</p>
          </div>
          <div className="troubleshoot-card">
            <h3 className="heading-3">Audio Issues?</h3>
            <p className="body-medium">Check your voice channel permissions and bot volume settings.</p>
          </div>
          <div className="troubleshoot-card">
            <h3 className="heading-3">Commands Not Working?</h3>
            <p className="body-medium">Ensure you're using slash commands (/) and the bot is in your voice channel.</p>
          </div>
        </div>
        <div className="notify-support-container">
          <button className="btn-secondary" onClick={() => alert('Support notifications coming soon! For now, join our Discord support server.')}>
            Notify Support
          </button>
        </div>
      </section>

      {/* Characters Section */}
      <section id="characters" className="characters-section">
        <h2 className="display-large section-title">Meet The Gang</h2>
        <div className="characters-grid">
          <div className="character-card">
            <img src="/assets/stan.png" alt="Stan Smith" className="character-img" />
            <div className="speech-bubble">
              <p>"This bot is more patriotic than apple pie! Add it to your server, that's an order!"</p>
            </div>
            <h3 className="heading-3">Stan Smith</h3>
          </div>
          
          <div className="character-card">
            <img src="/assets/roger.png" alt="Roger" className="character-img" />
            <div className="speech-bubble">
              <p>"I've DJ'd at better parties than this, but this bot? *Chef's kiss* Perfection!"</p>
            </div>
            <h3 className="heading-3">Roger</h3>
          </div>
          
          <div className="character-card">
            <img src="/assets/francine.png" alt="Francine Smith" className="character-img" />
            <div className="speech-bubble">
              <p>"Finally, a bot that plays my favorite tunes! Stan, invite this to all your CIA servers!"</p>
            </div>
            <h3 className="heading-3">Francine Smith</h3>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="footer-content">
          <div className="footer-section">
            <h3 className="heading-3">Stans Beat Bot</h3>
            <p className="body-small">The ultimate American Dad music bot for Discord</p>
          </div>
          
          <div className="footer-section">
            <h4 className="heading-3">Quick Links</h4>
            <nav className="footer-nav">
              <a href="#features" className="footer-link">Features</a>
              <a href="#commands" className="footer-link">Commands</a>
              <a href="#premium" className="footer-link">Premium</a>
              <a href={inviteBotUrl} target="_blank" rel="noopener noreferrer" className="footer-link">Invite Bot</a>
            </nav>
          </div>
          
          <div className="footer-section">
            <h4 className="heading-3">Bot Integration</h4>
            <p className="body-small">To track subscriptions, your Discord bot should call:</p>
            <code className="footer-code">/api/premium/verify/{'<user_id>'}</code>
          </div>
        </div>
        
        <div className="footer-bottom">
          <p className="body-small">© 2025 Stans Beat Bot. All rights reserved. Not affiliated with American Dad or Fox.</p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
