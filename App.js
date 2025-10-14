import React, { useState } from 'react';
import './App.css';

function App() {
  const [currentTab, setCurrentTab] = useState('home');

  return (
    <div className="App">
      <nav>
        <div className="nav-container">
          <div className="logo">Stan's Beat Bot</div>
          <ul className="nav-links">
            <li><a href="#" onClick={() => setCurrentTab('home')} className={currentTab === 'home' ? 'active' : ''}>Home</a></li>
            <li><a href="#" onClick={() => setCurrentTab('subscriptions')} className={currentTab === 'subscriptions' ? 'active' : ''}>Subscriptions</a></li>
            <li><a href="#" onClick={() => setCurrentTab('gang')} className={currentTab === 'gang' ? 'active' : ''}>Meet the Gang</a></li>
            <li><a href="#" onClick={() => setCurrentTab('docs')} className={currentTab === 'docs' ? 'active' : ''}>Docs</a></li>
            <li><a href="#" onClick={() => setCurrentTab('help')} className={currentTab === 'help' ? 'active' : ''}>Help</a></li>
          </ul>
        </div>
      </nav>

      {currentTab === 'home' && <HomePage />}
      {currentTab === 'subscriptions' && <SubscriptionsPage />}
      {currentTab === 'gang' && <MeetTheGangPage />}
      {currentTab === 'docs' && <DocsPage />}
      {currentTab === 'help' && <HelpPage />}

      <footer>
        <p>&copy; 2024 Stan's Beat Bot - Bringing American Dad vibes to your Discord server!</p>
        <p>Not affiliated with American Dad or Fox Broadcasting Company.</p>
      </footer>
    </div>
  );
}

function HomePage() {
  return (
    <>
      <div className="hero-section">
        <h1>Stan's Beat Bot</h1>
        <p>The CIA-approved Discord music bot that brings American Dad vibes to your server!</p>
        <a href="https://discord.com/oauth2/authorize?client_id=1049861443111112744&permissions=3206144&integration_type=0&scope=bot+applications.commands" className="cta-button" target="_blank" rel="noopener noreferrer">Add to Discord</a>
      </div>

      <div className="container">
        <section className="features-section">
          <h2>Features</h2>
          <div className="features-grid">
            <div className="feature-card">
              <h3>🎵 High-Quality Audio</h3>
              <p>Crystal clear music playback that even Roger would approve of!</p>
            </div>
            <div className="feature-card">
              <h3>⚡ Fast & Reliable</h3>
              <p>Quick response times - faster than Stan running from his feelings!</p>
            </div>
            <div className="feature-card">
              <h3>🎮 Easy Commands</h3>
              <p>Simple slash commands that even Steve could figure out!</p>
            </div>
            <div className="feature-card">
              <h3>🔊 Queue Management</h3>
              <p>Control your playlist like Stan controls his household!</p>
            </div>
          </div>
        </section>

        <section className="about-section">
          <h2>About Stan's Beat Bot</h2>
          <p>Stan's Beat Bot is your go-to Discord music companion, themed after everyone's favorite CIA agent and his chaotic family. Whether you're jamming out to patriotic anthems or Roger's club bangers, this bot has you covered!</p>
        </section>
      </div>
    </>
  );
}

function SubscriptionsPage() {
  return (
    <>
      <div className="hero-section">
        <h1>Premium Subscriptions</h1>
        <p>Upgrade your Stan's Beat Bot experience with exclusive features!</p>
      </div>

      <div className="container">
        <div className="pricing-grid">
          <div className="pricing-card">
            <div className="pricing-header">
              <h2>Free Tier</h2>
              <div className="price">$0<span>/month</span></div>
            </div>
            <ul className="features-list">
              <li>✓ Basic music playback</li>
              <li>✓ Standard queue system</li>
              <li>✓ Basic commands</li>
              <li>✓ Community support</li>
            </ul>
            <a href="https://discord.com/oauth2/authorize?client_id=1049861443111112744&permissions=3206144&integration_type=0&scope=bot+applications.commands" className="cta-button" target="_blank" rel="noopener noreferrer">Add to Discord</a>
          </div>

          <div className="pricing-card featured">
            <div className="badge">Most Popular</div>
            <div className="pricing-header">
              <h2>Premium</h2>
              <div className="price">$4.99<span>/month</span></div>
            </div>
            <ul className="features-list">
              <li>✓ Everything in Free</li>
              <li>✓ Priority queue access</li>
              <li>✓ Custom playlists</li>
              <li>✓ Extended playtime</li>
              <li>✓ Advanced audio filters</li>
              <li>✓ Priority support</li>
            </ul>
            <form action="https://www.paypal.com/cgi-bin/webscr" method="post" target="_blank">
              <input type="hidden" name="cmd" value="_s-xclick" />
              <input type="hidden" name="hosted_button_id" value="YOUR_BUTTON_ID" />
              <button type="submit" className="cta-button">Subscribe Now</button>
            </form>
          </div>

          <div className="pricing-card">
            <div className="pricing-header">
              <h2>Pro</h2>
              <div className="price">$9.99<span>/month</span></div>
            </div>
            <ul className="features-list">
              <li>✓ Everything in Premium</li>
              <li>✓ Unlimited skips</li>
              <li>✓ Voice channel priority</li>
              <li>✓ Custom bot status</li>
              <li>✓ Exclusive American Dad themes</li>
              <li>✓ API access</li>
              <li>✓ VIP support channel</li>
            </ul>
            <form action="https://www.paypal.com/cgi-bin/webscr" method="post" target="_blank">
              <input type="hidden" name="cmd" value="_s-xclick" />
              <input type="hidden" name="hosted_button_id" value="YOUR_PRO_BUTTON_ID" />
              <button type="submit" className="cta-button">Subscribe Now</button>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}

function MeetTheGangPage() {
  return (
    <>
      <div className="hero-section">
        <h1>Meet the Gang</h1>
        <p>Get to know the Smith family and friends behind the bot!</p>
      </div>

      <div className="container">
        <div className="gang-grid">
          <div className="gang-card">
            <h3>🕴️ Stan Smith</h3>
            <p><strong>Role:</strong> Head Bot Admin</p>
            <p>The patriotic CIA agent who runs this operation. Keeps everything secure and running smoothly!</p>
          </div>

          <div className="gang-card">
            <h3>👩 Francine Smith</h3>
            <p><strong>Role:</strong> Community Manager</p>
            <p>The heart of the server! Handles community engagement and keeps everyone happy.</p>
          </div>

          <div className="gang-card">
            <h3>👽 Roger</h3>
            <p><strong>Role:</strong> Creative Director</p>
            <p>The alien with a thousand personas! Designs all the quirky features and Easter eggs.</p>
          </div>

          <div className="gang-card">
            <h3>🎓 Steve Smith</h3>
            <p><strong>Role:</strong> Junior Developer</p>
            <p>Stan's nerdy son who helps with coding and troubleshooting bugs.</p>
          </div>

          <div className="gang-card">
            <h3>👧 Hayley Smith</h3>
            <p><strong>Role:</strong> Social Media Manager</p>
            <p>The liberal activist keeping our social presence strong and progressive!</p>
          </div>

          <div className="gang-card">
            <h3>🐟 Klaus</h3>
            <p><strong>Role:</strong> Quality Assurance</p>
            <p>The German fish in a bowl who tests every feature thoroughly!</p>
          </div>
        </div>
      </div>
    </>
  );
}

function DocsPage() {
  return (
    <>
      <div className="hero-section">
        <h1>Documentation</h1>
        <p>Everything you need to know about Stan's Beat Bot</p>
      </div>

      <div className="container">
        <section className="docs-section">
          <h2>Getting Started</h2>
          <p>Add Stan's Beat Bot to your Discord server using the invite link, then use <code>/help</code> to see all available commands!</p>
        </section>

        <section className="docs-section">
          <h2>Basic Commands</h2>
          <div className="command-list">
            <div className="command-item">
              <code>/play [song/url]</code>
              <p>Play a song or add it to the queue</p>
            </div>
            <div className="command-item">
              <code>/pause</code>
              <p>Pause the current track</p>
            </div>
            <div className="command-item">
              <code>/resume</code>
              <p>Resume playback</p>
            </div>
            <div className="command-item">
              <code>/skip</code>
              <p>Skip to the next song in queue</p>
            </div>
            <div className="command-item">
              <code>/queue</code>
              <p>View the current music queue</p>
            </div>
            <div className="command-item">
              <code>/stop</code>
              <p>Stop playback and clear the queue</p>
            </div>
          </div>
        </section>

        <section className="docs-section">
          <h2>Premium Commands</h2>
          <div className="command-list">
            <div className="command-item">
              <code>/loop</code>
              <p>Loop the current track or queue (Premium)</p>
            </div>
            <div className="command-item">
              <code>/filter [type]</code>
              <p>Apply audio filters (Premium)</p>
            </div>
            <div className="command-item">
              <code>/playlist [name]</code>
              <p>Load your saved playlists (Premium)</p>
            </div>
          </div>
        </section>

        <section className="docs-section">
          <h2>Troubleshooting</h2>
          <div className="faq-item">
            <h3>Bot won't join voice channel?</h3>
            <p>Make sure the bot has permission to join and speak in your voice channel. Check server settings and bot permissions.</p>
          </div>
          <div className="faq-item">
            <h3>Music not playing?</h3>
            <p>Verify you're in a voice channel and the bot has proper permissions. Try using /stop and then /play again.</p>
          </div>
          <div className="faq-item">
            <h3>Commands not working?</h3>
            <p>Make sure you're using slash commands (/). The bot requires the "Use Application Commands" permission.</p>
          </div>
        </section>
      </div>
    </>
  );
}

function HelpPage() {
  return (
    <>
      <div className="hero-section">
        <h1>Need Help?</h1>
        <p>We're here to support you! Get in touch with the Stan's Beat Bot team.</p>
      </div>

      <div className="container">
        <section className="help-section">
          <h2>Submit a Support Ticket</h2>
          <p>Having issues? Fill out the form below and we'll get back to you as soon as possible. Our ticket bot will create a support ticket and notify our team via webhook.</p>
          
          <form className="help-form" id="supportForm">
            <div className="form-group">
              <label htmlFor="discord-username">Discord Username</label>
              <input type="text" id="discord-username" name="username" placeholder="YourName#1234" required />
            </div>

            <div className="form-group">
              <label htmlFor="server-id">Server ID (Optional)</label>
              <input type="text" id="server-id" name="serverId" placeholder="123456789012345678" />
            </div>

            <div className="form-group">
              <label htmlFor="issue-type">Issue Type</label>
              <select id="issue-type" name="issueType" required>
                <option value="">Select an issue type...</option>
                <option value="bot-not-working">Bot Not Working</option>
                <option value="audio-issues">Audio Issues</option>
                <option value="commands-broken">Commands Not Working</option>
                <option value="subscription">Subscription/Billing</option>
                <option value="feature-request">Feature Request</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="description">Description</label>
              <textarea id="description" name="description" rows="6" placeholder="Please describe your issue in detail..." required></textarea>
            </div>

            <button type="submit" className="cta-button">Submit Ticket</button>
          </form>

          <p className="help-note">⚠️ Ticket system integration coming soon! For now, join our Discord server for immediate support.</p>
        </section>

        <section className="help-section">
          <h2>Other Ways to Get Help</h2>
          <div className="contact-options">
            <div className="contact-card">
              <h3>📱 Discord Support Server</h3>
              <p>Join our community server for real-time help and to chat with other users!</p>
              <a href="#" className="cta-button">Join Server</a>
            </div>

            <div className="contact-card">
              <h3>📚 Documentation</h3>
              <p>Check out our docs for guides, tutorials, and FAQ answers.</p>
              <a href="#" className="cta-button">View Docs</a>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}

export default App;
