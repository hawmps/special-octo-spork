import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  AppBar,
  Toolbar,
  Typography,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  IconButton,
  Box,
  Avatar,
  Menu,
  MenuItem,
  Divider,
  useTheme,
  useMediaQuery,
  Badge,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard,
  Business,
  Assignment,
  People,
  Build,
  TrendingUp,
  Inventory,
  AccountCircle,
  Logout,
  Settings,
  Schedule,
  Notifications,
} from '@mui/icons-material';
import { useAuth } from '@/hooks/useAuth';
import { apiService } from '@/services/api';

const drawerWidth = 240;

interface NavigationItem {
  text: string;
  path: string;
  icon: React.ReactElement;
  roles?: string[];
}

const navigationItems: NavigationItem[] = [
  { text: 'Dashboard', path: '/dashboard', icon: <Dashboard /> },
  { text: 'Accounts', path: '/accounts', icon: <Business /> },
  { text: 'Work Orders', path: '/work-orders', icon: <Assignment /> },
  { 
    text: 'Service Agents', 
    path: '/service-agents', 
    icon: <People />,
    roles: ['platform_admin', 'field_manager']
  },
  { 
    text: 'Scheduling', 
    path: '/scheduling', 
    icon: <Schedule />,
    roles: ['platform_admin', 'field_manager']
  },
  { text: 'Assets', path: '/assets', icon: <Build /> },
  { text: 'Opportunities', path: '/opportunities', icon: <TrendingUp /> },
  { 
    text: 'Parts', 
    path: '/parts', 
    icon: <Inventory />,
    roles: ['platform_admin', 'field_manager']
  },
  { 
    text: 'Reports', 
    path: '/reports', 
    icon: <TrendingUp />,
    roles: ['platform_admin', 'field_manager']
  },
];

const Layout: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const navigate = useNavigate();
  const location = useLocation();
  const { authState, signOut } = useAuth();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/login');
    } catch (error) {
      console.error('Sign out error:', error);
    }
    handleMenuClose();
  };

  const hasPermission = (roles?: string[]) => {
    if (!roles || roles.length === 0) return true;
    const userGroups = authState.user?.groups || [];
    return roles.some(role => userGroups.includes(role));
  };

  // Fetch unread notifications count for agents
  useEffect(() => {
    const fetchNotificationsCount = async () => {
      if (authState.isAuthenticated && authState.user?.id) {
        try {
          const response = await apiService.getAgentNotifications(authState.user.id, { 
            limit: 1, 
            unread_only: true 
          });
          setUnreadNotifications(response.data.length);
        } catch (error) {
          // Silently fail - notifications are not critical for app functionality
          console.log('Could not fetch notifications:', error);
        }
      }
    };

    fetchNotificationsCount();
    
    // Refresh notifications count every 5 minutes
    const interval = setInterval(fetchNotificationsCount, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, [authState.isAuthenticated, authState.user?.id]);

  const drawer = (
    <Box>
      <Toolbar>
        <Typography variant="h6" noWrap component="div">
          Field Service CRM
        </Typography>
      </Toolbar>
      <Divider />
      <List>
        {navigationItems
          .filter(item => hasPermission(item.roles))
          .map((item) => (
            <ListItem key={item.text} disablePadding>
              <ListItemButton
                selected={location.pathname === item.path || location.pathname.startsWith(item.path + '/')}
                onClick={() => {
                  navigate(item.path);
                  if (isMobile) {
                    setMobileOpen(false);
                  }
                }}
              >
                <ListItemIcon>{item.icon}</ListItemIcon>
                <ListItemText primary={item.text} />
              </ListItemButton>
            </ListItem>
          ))}
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar
        position="fixed"
        sx={{
          width: { md: `calc(100% - ${drawerWidth}px)` },
          ml: { md: `${drawerWidth}px` },
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { md: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            Field Service CRM
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Typography variant="body2" sx={{ mr: 2 }}>
              {authState.user?.firstName} {authState.user?.lastName}
            </Typography>
            
            {/* Notifications Icon */}
            <IconButton
              size="large"
              aria-label="notifications"
              color="inherit"
              sx={{ mr: 1 }}
            >
              <Badge badgeContent={unreadNotifications} color="error">
                <Notifications />
              </Badge>
            </IconButton>
            
            <IconButton
              size="large"
              aria-label="account of current user"
              aria-controls="menu-appbar"
              aria-haspopup="true"
              onClick={handleMenuOpen}
              color="inherit"
            >
              <Avatar sx={{ width: 32, height: 32 }}>
                <AccountCircle />
              </Avatar>
            </IconButton>
            <Menu
              id="menu-appbar"
              anchorEl={anchorEl}
              anchorOrigin={{
                vertical: 'bottom',
                horizontal: 'right',
              }}
              keepMounted
              transformOrigin={{
                vertical: 'top',
                horizontal: 'right',
              }}
              open={Boolean(anchorEl)}
              onClose={handleMenuClose}
            >
              <MenuItem onClick={handleMenuClose}>
                <ListItemIcon>
                  <Settings fontSize="small" />
                </ListItemIcon>
                Profile Settings
              </MenuItem>
              <Divider />
              <MenuItem onClick={handleSignOut}>
                <ListItemIcon>
                  <Logout fontSize="small" />
                </ListItemIcon>
                Sign Out
              </MenuItem>
            </Menu>
          </Box>
        </Toolbar>
      </AppBar>

      <Box
        component="nav"
        sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true,
          }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidth,
            },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidth,
            },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { md: `calc(100% - ${drawerWidth}px)` },
          mt: 8,
        }}
      >
        <Outlet />
      </Box>
    </Box>
  );
};

export default Layout;