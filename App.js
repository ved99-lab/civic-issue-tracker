import { useState, useEffect, useCallback } from 'react';
import './App.css';

// Constants
const CATEGORY_ICONS = {
  Road: "🛣️",
  Sanitation: "🗑️",
  Water: "🚰",
  Electricity: "💡",
  Other: "❓"
};

const STATUS_OPTIONS = ["Pending", "In Progress", "Resolved"];
const SORT_OPTIONS = [
  { value: "newest", label: "Newest First" },
  { value: "oldest", label: "Oldest First" },
  { value: "most-voted", label: "Most Votes" },
  { value: "least-voted", label: "Least Votes" }
];

const DEFAULT_ISSUES = [
  {
    id: 1,
    title: "Pothole on Main Road",
    description: "Large pothole near the intersection causing traffic issues",
    category: "Road",
    location: "Connaught Place, Delhi",
    image: "https://images.unsplash.com/photo-1563555397763-5fc103c6f7b8?w=500&auto=format&fit=crop",
    status: "Pending",
    votes: 4,
    userAddress: null,
    comments: [
      { id: 1, user: "Resident1", text: "This has been here for weeks!" },
      { id: 2, user: "Driver123", text: "Damaged my car's suspension" }
    ],
    createdAt: new Date().toISOString()
  },
  {
    id: 2,
    title: "Garbage Overflow",
    description: "Trash bin not emptied in 5 days, causing foul smell",
    category: "Sanitation",
    location: "Karol Bagh Market",
    image: "https://images.unsplash.com/photo-1503596476-1c12a8ba09a9?w=500&auto=format&fit=crop",
    status: "In Progress",
    votes: 8,
    userAddress: null,
    comments: [
      { id: 1, user: "LocalBiz", text: "Affecting our customers" }
    ],
    createdAt: new Date(Date.now() - 86400000).toISOString()
  }
];

const DEFAULT_STATE = {
  issues: DEFAULT_ISSUES,
  currentAccount: null,
  isWalletConnecting: false,
  newIssue: {
    title: "",
    description: "",
    category: "Road",
    location: "",
    image: ""
  },
  activeTab: "all",
  showForm: false,
  isSubmitting: false,
  notification: null,
  searchTerm: "",
  filterCategory: "All",
  sortBy: "newest",
  showStats: false,
  darkMode: false,
  showMap: false,
  showUserProfile: false,
  userProfile: {
    displayName: "Anonymous",
    notificationsEnabled: true,
    bio: ""
  }
};

function App() {
  const [state, setState] = useState(() => {
    const savedState = localStorage.getItem('fixDelhiState');
    return savedState ? JSON.parse(savedState) : DEFAULT_STATE;
  });

  const {
    issues, currentAccount, isWalletConnecting, newIssue, activeTab, showForm,
    isSubmitting, notification, searchTerm, filterCategory, sortBy, showStats,
    darkMode, showMap, showUserProfile, userProfile
  } = state;

  // Save state to localStorage and handle dark mode
  useEffect(() => {
    localStorage.setItem('fixDelhiState', JSON.stringify(state));
    document.body.classList.toggle('dark-mode', darkMode);
  }, [state, darkMode]);

  // Wallet connection handler
  useEffect(() => {
    const handleAccountsChanged = (accounts) => {
      updateState({ currentAccount: accounts[0] || null });
      showNotification(accounts[0] ? "Wallet connected" : "Wallet disconnected");
    };

    const checkWalletConnection = async () => {
      if (window.ethereum) {
        try {
          const accounts = await window.ethereum.request({ method: 'eth_accounts' });
          if (accounts.length) {
            updateState({ currentAccount: accounts[0] });
          }
        } catch (error) {
          showNotification("Error connecting to wallet", "error");
        }
      }
    };

    checkWalletConnection();
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', handleAccountsChanged);
    }

    return () => {
      window.ethereum?.removeListener?.('accountsChanged', handleAccountsChanged);
    };
  }, []);

  // Helper functions
  const updateState = useCallback((updates) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  const showNotification = useCallback((message, type = "success") => {
    updateState({ notification: { message, type } });
    setTimeout(() => updateState({ notification: null }), 5000);
  }, [updateState]);

  // Wallet connection
  const connectWallet = async () => {
    if (!window.ethereum) {
      showNotification("Please install MetaMask!", "error");
      return;
    }

    try {
      updateState({ isWalletConnecting: true });
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      updateState({ currentAccount: accounts[0] });
      showNotification("Wallet connected successfully!");
    } catch (error) {
      showNotification("Failed to connect wallet", "error");
      console.error("Wallet connection error:", error);
    } finally {
      updateState({ isWalletConnecting: false });
    }
  };

  const disconnectWallet = () => {
    updateState({ currentAccount: null });
    showNotification("Wallet disconnected");
  };

  // Issue management
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      showNotification("File size should not exceed 2MB", "error");
      return;
    }
    
    const reader = new FileReader();
    reader.onload = (event) => {
      updateState({ newIssue: { ...newIssue, image: event.target.result } });
    };
    reader.readAsDataURL(file);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    updateState({ newIssue: { ...newIssue, [name]: value } });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    updateState({ isSubmitting: true });
    
    try {
      const issue = {
        ...newIssue,
        id: Date.now(),
        status: "Pending",
        votes: 0,
        userAddress: currentAccount,
        comments: [],
        image: newIssue.image || "https://images.unsplash.com/photo-1566438480900-0609be27a4be?w=500&auto=format&fit=crop",
        createdAt: new Date().toISOString()
      };
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      updateState(prev => ({
        issues: [...prev.issues, issue],
        newIssue: DEFAULT_STATE.newIssue,
        showForm: false,
        isSubmitting: false
      }));
      showNotification("Issue reported successfully!");
    } catch (error) {
      showNotification("Error submitting issue", "error");
      console.error("Submission error:", error);
      updateState({ isSubmitting: false });
    }
  };

  const upvoteIssue = (id) => {
    updateState(prev => ({
      issues: prev.issues.map(issue => 
        issue.id === id ? { ...issue, votes: issue.votes + 1 } : issue
      )
    }));
  };

  const updateStatus = (id, newStatus) => {
    updateState(prev => ({
      issues: prev.issues.map(issue => 
        issue.id === id ? { ...issue, status: newStatus } : issue
      )
    }));
  };

  // Filter and sort issues
  const getFilteredAndSortedIssues = useCallback(() => {
    let filtered = [...issues];
    
    // Filter by tab
    if (activeTab === "my") {
      filtered = filtered.filter(issue => issue.userAddress === currentAccount);
    } else if (activeTab !== "all") {
      filtered = filtered.filter(issue => issue.status.toLowerCase() === activeTab);
    }
    
    // Filter by search
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(issue => 
        issue.title.toLowerCase().includes(term) ||
        issue.description.toLowerCase().includes(term) ||
        issue.location.toLowerCase().includes(term)
      );
    }
    
    // Filter by category
    if (filterCategory !== "All") {
      filtered = filtered.filter(issue => issue.category === filterCategory);
    }
    
    // Sort by selected option
    switch (sortBy) {
      case "newest":
        filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        break;
      case "oldest":
        filtered.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
        break;
      case "most-voted":
        filtered.sort((a, b) => b.votes - a.votes);
        break;
      case "least-voted":
        filtered.sort((a, b) => a.votes - b.votes);
        break;
      default:
        break;
    }
    
    return filtered;
  }, [issues, activeTab, currentAccount, searchTerm, filterCategory, sortBy]);

  // Components
  const WalletConnectScreen = () => (
    <div className={`wallet-connect-screen ${darkMode ? 'dark-mode' : ''}`}>
      <div className="wallet-connect-container">
        <h1>Welcome to FixDelhi! 🏙️</h1>
        <p>Connect your wallet to report and track civic issues in Delhi</p>
        
        <button 
          onClick={connectWallet} 
          className="connect-wallet-btn"
          disabled={isWalletConnecting}
        >
          {isWalletConnecting ? "Connecting..." : "Connect Wallet"}
        </button>
        
        {!window.ethereum && (
          <div className="metamask-install-prompt">
            <p>You need MetaMask to use this application</p>
            <a 
              href="https://metamask.io/download/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="install-link"
            >
              Install MetaMask
            </a>
          </div>
        )}
      </div>
    </div>
  );

  const Header = () => (
    <header className="header">
      <div className="header-content">
        <h1>🏙️ FixDelhi</h1>
        <p>Report and track civic issues in Delhi</p>
      </div>
      
      <div className="app-controls">
        <button 
          onClick={() => updateState({ darkMode: !darkMode })} 
          className="icon-btn" 
          title="Toggle Dark Mode"
        >
          {darkMode ? "☀️" : "🌙"}
        </button>
        
        <button 
          onClick={() => updateState({ showStats: !showStats })} 
          className="icon-btn" 
          title="View Statistics"
        >
          📊
        </button>
        
        <button 
          onClick={() => updateState({ showMap: !showMap })} 
          className="icon-btn" 
          title="View Issues Map"
        >
          🗺️
        </button>
        
        <div className="wallet-info">
          <button 
            onClick={() => updateState({ showUserProfile: !showUserProfile })} 
            className="profile-btn" 
            title="User Profile"
          >
            👤 {userProfile.displayName}
          </button>
          <span className="wallet-address">
            {`${currentAccount.substring(0, 6)}...${currentAccount.substring(currentAccount.length - 4)}`}
          </span>
          <button onClick={disconnectWallet} className="disconnect-btn" title="Disconnect wallet">
            Disconnect
          </button>
        </div>
      </div>
    </header>
  );

  const StatsDashboard = () => {
    const stats = {
      totalIssues: issues.length,
      pendingIssues: issues.filter(issue => issue.status === "Pending").length,
      inProgressIssues: issues.filter(issue => issue.status === "In Progress").length,
      resolvedIssues: issues.filter(issue => issue.status === "Resolved").length,
      categoryCounts: Object.keys(CATEGORY_ICONS).reduce((acc, category) => {
        acc[category] = issues.filter(issue => issue.category === category).length;
        return acc;
      }, {}),
      myIssues: issues.filter(issue => issue.userAddress === currentAccount).length
    };
    
    return (
      <div className="stats-dashboard">
        <div className="stats-header">
          <h2>📊 Issue Statistics</h2>
          <button onClick={() => updateState({ showStats: false })} className="close-btn">×</button>
        </div>
        
        <div className="stats-content">
          <div className="stats-cards">
            {[
              { label: "Total Issues", value: stats.totalIssues },
              { label: "Pending", value: stats.pendingIssues, className: "pending" },
              { label: "In Progress", value: stats.inProgressIssues, className: "in-progress" },
              { label: "Resolved", value: stats.resolvedIssues, className: "resolved" },
              { label: "My Issues", value: stats.myIssues }
            ].map((stat, index) => (
              <div key={index} className="stat-card">
                <h3>{stat.label}</h3>
                <p className={`stat-value ${stat.className || ''}`}>{stat.value}</p>
              </div>
            ))}
          </div>
          
          <div className="stats-charts">
            <div className="category-chart">
              <h3>Issues by Category</h3>
              <div className="category-bars">
                {Object.entries(stats.categoryCounts).map(([category, count]) => (
                  <div key={category} className="category-bar-container">
                    <div className="category-label">
                      <span>{CATEGORY_ICONS[category]} {category}</span>
                      <span>{count}</span>
                    </div>
                    <div className="category-bar-bg">
                      <div 
                        className="category-bar"
                        style={{ width: `${(count / stats.totalIssues) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const MapView = () => (
    <div className="map-container">
      <div className="map-header">
        <h2>🗺️ Issue Map</h2>
        <button onClick={() => updateState({ showMap: false })} className="close-btn">×</button>
      </div>
      
      <div className="map-placeholder">
        <div className="map-info">
          <p>Interactive map showing all reported issues across Delhi</p>
          <p className="map-note">Map integration would display real issue locations here</p>
        </div>
        
        <div className="map-legend">
          <h4>Legend</h4>
          <div className="legend-items">
            {Object.entries(CATEGORY_ICONS).map(([category, icon]) => (
              <div key={category} className="legend-item">
                <span className="legend-icon">{icon}</span>
                <span>{category}</span>
              </div>
            ))}
          </div>
          
          <div className="status-legend">
            {["Pending", "In Progress", "Resolved"].map(status => (
              <div key={status} className="status-item">
                <span className={`status-dot ${status.toLowerCase().replace(' ', '-')}`}></span> {status}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const UserProfile = () => {
    const [formData, setFormData] = useState(userProfile);

    const handleChange = (e) => {
      const { name, value, type, checked } = e.target;
      setFormData(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      }));
    };

    const handleSubmit = (e) => {
      e.preventDefault();
      updateState({ 
        userProfile: { ...userProfile, ...formData },
        showUserProfile: false
      });
      showNotification("Profile updated successfully!");
    };

    const userStats = {
      reported: issues.filter(issue => issue.userAddress === currentAccount).length,
      resolved: issues.filter(issue => 
        issue.userAddress === currentAccount && issue.status === "Resolved"
      ).length,
      comments: issues.reduce((count, issue) => 
        count + issue.comments.filter(comment => comment.user === currentAccount).length, 
      0)
    };

    return (
      <div className="user-profile-modal">
        <div className="profile-header">
          <h2>👤 User Profile</h2>
          <button onClick={() => updateState({ showUserProfile: false })} className="close-btn">×</button>
        </div>
        
        <div className="profile-content">
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Display Name</label>
              <input 
                type="text" 
                name="displayName"
                value={formData.displayName}
                onChange={handleChange}
                placeholder="How you want to be known"
                maxLength={20}
                required
              />
            </div>
            
            <div className="form-group">
              <label>Bio</label>
              <textarea
                name="bio"
                value={formData.bio}
                onChange={handleChange}
                placeholder="Tell us about yourself (optional)"
                maxLength={150}
              />
            </div>
            
            <div className="form-group checkbox-group">
              <label>
                <input 
                  type="checkbox" 
                  name="notificationsEnabled"
                  checked={formData.notificationsEnabled}
                  onChange={handleChange}
                />
                Enable notifications
              </label>
            </div>
            
            <div className="profile-stats">
              <h3>Your Stats</h3>
              <div className="stats-items">
                {[
                  { label: "Issues reported:", value: userStats.reported },
                  { label: "Resolved issues:", value: userStats.resolved },
                  { label: "Comments made:", value: userStats.comments }
                ].map((stat, index) => (
                  <div key={index} className="stat-item">
                    <span>{stat.label}</span>
                    <span>{stat.value}</span>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="wallet-connection">
              <h3>Connected Wallet</h3>
              <p className="wallet-address">{currentAccount}</p>
            </div>
            
            <button type="submit" className="save-profile-btn">Save Profile</button>
          </form>
        </div>
      </div>
    );
  };

  const IssueCard = ({ issue }) => {
    const [commentText, setCommentText] = useState("");

    const shareIssue = () => {
      if (navigator.share) {
        navigator.share({
          title: `FixDelhi: ${issue.title}`,
          text: `Check out this civic issue in Delhi: ${issue.title} at ${issue.location}`,
          url: `https://fixdelhi.app/issue/${issue.id}`
        }).catch(console.error);
      } else {
        const shareText = `Check out this civic issue in Delhi: ${issue.title} at ${issue.location} - https://fixdelhi.app/issue/${issue.id}`;
        navigator.clipboard.writeText(shareText)
          .then(() => showNotification("Share link copied to clipboard!"))
          .catch(() => showNotification("Failed to copy share link", "error"));
      }
    };

    const handleAddComment = () => {
      if (!commentText.trim()) return;
      updateState(prev => ({
        issues: prev.issues.map(i => 
          i.id === issue.id 
            ? { 
                ...i, 
                comments: [...i.comments, { 
                  id: Date.now(), 
                  user: currentAccount || "Anonymous", 
                  text: commentText 
                }] 
              } 
            : i
        )
      }));
      setCommentText("");
    };

    return (
      <div className={`issue-card status-${issue.status.toLowerCase().replace(' ', '-')}`}>
        <div className="issue-header">
          <div className="title-with-icon">
            <span className="category-icon">{CATEGORY_ICONS[issue.category]}</span>
            <h3>{issue.title}</h3>
          </div>
          <span className="status-badge">{issue.status}</span>
        </div>
        
        <p className="issue-description">{issue.description}</p>
        
        <div className="issue-meta">
          <span>📍 {issue.location}</span>
          <span>🏷️ {issue.category}</span>
          {issue.userAddress === currentAccount && (
            <span className="your-issue">Your Submission</span>
          )}
          <span className="issue-date">
            📅 {new Date(issue.createdAt).toLocaleDateString()}
          </span>
        </div>
        
        <img src={issue.image} alt={issue.title} className="issue-image" />
        
        <div className="issue-actions">
          <div className="action-buttons">
            <button className="vote-btn" onClick={() => upvoteIssue(issue.id)}>
              👍 Upvote ({issue.votes})
            </button>
            
            <button className="share-btn" onClick={shareIssue}>
              📤 Share
            </button>
          </div>
          
          <details className="comments-section">
            <summary>Comments ({issue.comments.length})</summary>
            <div className="comments-list">
              {issue.comments.map(comment => (
                <div key={comment.id} className="comment">
                  <strong>
                    {comment.user === currentAccount 
                      ? userProfile.displayName 
                      : `${comment.user.substring(0, 6)}...`}
                  </strong>: {comment.text}
                </div>
              ))}
              <div className="add-comment">
                <input 
                  type="text" 
                  placeholder="Add a comment..." 
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddComment()}
                />
                <button onClick={handleAddComment}>Post</button>
              </div>
            </div>
          </details>
          
          {issue.userAddress === currentAccount && (
            <div className="status-controls">
              <label>Update Status:</label>
              <select
                value={issue.status}
                onChange={(e) => updateStatus(issue.id, e.target.value)}
              >
                {STATUS_OPTIONS.map(option => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>
    );
  };

  const MainContent = () => {
    const filteredIssues = getFilteredAndSortedIssues();

    return (
      <main className="main-content">
        <div className="controls">
          <div className="tabs">
            {["all", "my", "pending", "in progress", "resolved"].map(tab => (
              <button 
                key={tab}
                className={activeTab === tab ? "active" : ""}
                onClick={() => updateState({ activeTab: tab })}
              >
                {tab === "all" ? "All Issues" : 
                 tab === "my" ? "My Complaints" : 
                 tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
          
          <button 
            className="primary-btn" 
            onClick={() => updateState({ showForm: !showForm })}
          >
            {showForm ? "Cancel" : "Report New Issue"}
          </button>
        </div>

        <div className="search-filter-container">
          <div className="search-bar">
            <input
              type="text"
              placeholder="Search issues..."
              value={searchTerm}
              onChange={(e) => updateState({ searchTerm: e.target.value })}
            />
            {searchTerm && (
              <button 
                className="clear-search" 
                onClick={() => updateState({ searchTerm: "" })}
              >
                ×
              </button>
            )}
          </div>
          
          <div className="filter-controls">
            <div className="filter-group">
              <label>Category:</label>
              <select
                value={filterCategory}
                onChange={(e) => updateState({ filterCategory: e.target.value })}
              >
                <option value="All">All Categories</option>
                {Object.keys(CATEGORY_ICONS).map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>
            
            <div className="filter-group">
              <label>Sort by:</label>
              <select
                value={sortBy}
                onChange={(e) => updateState({ sortBy: e.target.value })}
              >
                {SORT_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {showForm && (
          <div className="issue-form">
            <h2>Report New Issue</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Title*</label>
                <input
                  type="text"
                  name="title"
                  value={newIssue.title}
                  onChange={handleInputChange}
                  required
                  placeholder="Brief title of the issue"
                />
              </div>
              
              <div className="form-group">
                <label>Description*</label>
                <textarea
                  name="description"
                  value={newIssue.description}
                  onChange={handleInputChange}
                  required
                  placeholder="Detailed description of the issue"
                />
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label>Category*</label>
                  <select
                    name="category"
                    value={newIssue.category}
                    onChange={handleInputChange}
                  >
                    {Object.keys(CATEGORY_ICONS).map(category => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                </div>
                
                <div className="form-group">
                  <label>Location*</label>
                  <input
                    type="text"
                    name="location"
                    value={newIssue.location}
                    onChange={handleInputChange}
                    required
                    placeholder="Where is the issue located?"
                  />
                </div>
              </div>
              
              <div className="form-group">
                <label>Upload Image</label>
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handleFileUpload} 
                  aria-label="Upload an image of the issue"
                />
                {newIssue.image && (
                  <div className="image-preview">
                    <img src={newIssue.image} alt="Preview" />
                  </div>
                )}
              </div>
              
              <button 
                type="submit" 
                className="submit-btn" 
                disabled={isSubmitting}
              >
                {isSubmitting ? "Submitting..." : "Submit Issue"}
              </button>
            </form>
          </div>
        )}

        <div className="issues-grid">
          {filteredIssues.length > 0 ? (
            filteredIssues.map(issue => (
              <IssueCard key={issue.id} issue={issue} />
            ))
          ) : (
            <div className="no-issues">
              {searchTerm || filterCategory !== "All" ? (
                <>
                  <p>No issues found matching your search criteria</p>
                  <button 
                    className="clear-filters-btn"
                    onClick={() => updateState({ 
                      searchTerm: "",
                      filterCategory: "All"
                    })}
                  >
                    Clear Filters
                  </button>
                </>
              ) : activeTab === "my" ? (
                <>
                  <p>You haven't reported any issues yet</p>
                  <button 
                    className="primary-btn" 
                    onClick={() => updateState({ showForm: true })}
                  >
                    Report Your First Issue
                  </button>
                </>
              ) : (
                <p>No issues found in this category</p>
              )}
            </div>
          )}
        </div>
      </main>
    );
  };

  const Footer = () => (
    <footer className="footer">
      <div className="footer-content">
        <div className="footer-section">
          <p>FixDelhi - Making Delhi better together</p>
          <p className="footer-stats">
            Total issues reported: {issues.length} | Resolved: {
              issues.filter(issue => issue.status === "Resolved").length
            }
          </p>
        </div>
        
        <div className="footer-section">
          <p className="wallet-info-footer">
            Connected as: {userProfile.displayName}
          </p>
          <p className="wallet-address-footer">
            Wallet: {`${currentAccount.substring(0, 6)}...${currentAccount.substring(currentAccount.length - 4)}`}
          </p>
        </div>
      </div>
    </footer>
  );

  if (!currentAccount) {
    return <WalletConnectScreen />;
  }

  return (
    <div className={`app ${darkMode ? 'dark-mode' : ''}`}>
      {notification && (
        <div className={`notification ${notification.type}`}>
          {notification.message}
        </div>
      )}

      <Header />

      {showStats && <StatsDashboard />}
      {showMap && <MapView />}
      {showUserProfile && <UserProfile />}

      <MainContent />
      
      <Footer />
    </div>
  );
}

export default App;