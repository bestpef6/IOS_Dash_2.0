import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  useColorScheme,
  TouchableOpacity,
  Image,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  runOnJS,
  FadeIn,
  Layout,
} from 'react-native-reanimated';
import { Trash2, Bell } from 'lucide-react-native';
import NotificationDetailsModal from './NotificationDetailsModal';

// Mock data for development
const mockNotifications = [
  {
    id: 1,
    source: 'Telegram',
    content: 'New signal alert for BTC/USD',
    received_at: new Date().toISOString(),
    chat_id: 12345,
    chat_title: 'Crypto Signals',
  },
  {
    id: 2,
    source: 'Telegram',
    content: 'Market analysis for today',
    received_at: new Date(Date.now() - 3600000).toISOString(),
    chat_id: 67890,
    chat_title: 'Trading Group',
  },
  {
    id: 3,
    source: 'TradingView',
    content: 'Price alert: BTC/USD above 50000',
    received_at: new Date(Date.now() - 7200000).toISOString(),
  },
];

interface Notification {
  id: number;
  source: string;
  content: string;
  received_at: string;
  chat_id?: number;
  chat_title?: string;
}

export default function NewNotificationWidget() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedSource, setSelectedSource] = useState<string>('');
  const deleteButtonWidth = 80;

  // Initialize translateX values for both sources
  const telegramTranslateX = useSharedValue(0);
  const tradingViewTranslateX = useSharedValue(0);

  React.useEffect(() => {
    setNotifications(mockNotifications);
  }, []);

  const getSourceNotifications = (source: string) => {
    return notifications.filter((n) => n.source === source);
  };

  const getLatestNotification = (source: string) => {
    return notifications
      .filter((n) => n.source === source)
      .sort(
        (a, b) =>
          new Date(b.received_at).getTime() - new Date(a.received_at).getTime()
      )[0];
  };

  const formatTimestamp = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);

    if (minutes < 60) {
      return `${minutes}m ago`;
    } else if (minutes < 1440) {
      return `${Math.floor(minutes / 60)}h ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const handleDeleteSource = useCallback(
    (source: string) => {
      setNotifications((prev) =>
        prev.filter((notification) => notification.source !== source)
      );
      if (source === 'Telegram') {
        telegramTranslateX.value = withSpring(0);
      } else {
        tradingViewTranslateX.value = withSpring(0);
      }
    },
    [telegramTranslateX, tradingViewTranslateX]
  );

  const createPanGesture = (source: string) => {
    const translateX = source === 'Telegram' ? telegramTranslateX : tradingViewTranslateX;
    
    return Gesture.Pan()
      .activeOffsetX(-10)
      .onUpdate((event) => {
        const newValue = Math.min(0, Math.max(-deleteButtonWidth, event.translationX));
        translateX.value = newValue;
      })
      .onEnd(() => {
        const shouldDelete = translateX.value < -deleteButtonWidth / 2;
        if (shouldDelete) {
          runOnJS(handleDeleteSource)(source);
        } else {
          translateX.value = withSpring(0);
        }
      });
  };

  const renderSourceSummary = (source: string) => {
    const sourceNotifications = getSourceNotifications(source);
    const translateX = source === 'Telegram' ? telegramTranslateX : tradingViewTranslateX;
    const latest = getLatestNotification(source);
    const uniqueChats =
      source === 'Telegram'
        ? new Set(sourceNotifications.map((n) => n.chat_title)).size
        : null;

    const summaryText =
      source === 'Telegram'
        ? `${sourceNotifications.length} new messages from ${uniqueChats} distinct chats`
        : `${sourceNotifications.length} new alerts`;

    const animatedStyle = useAnimatedStyle(() => ({
      transform: [{ translateX: translateX.value }],
      height: sourceNotifications.length === 0 ? 0 : 100,
      opacity: sourceNotifications.length === 0 ? 0 : 1,
    }));

    const gesture = createPanGesture(source);

    return (
      <Animated.View
        key={source}
        style={[styles.sourceContainer, animatedStyle]}
        layout={Layout.springify()}
      >
        {sourceNotifications.length > 0 && (
          <>
            <GestureDetector gesture={gesture}>
              <Animated.View
                style={[
                  styles.sourceSummary,
                  {
                    backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
                  },
                ]}
              >
                <TouchableOpacity
                  style={styles.summaryContent}
                  onPress={() => {
                    setSelectedSource(source);
                    setIsModalVisible(true);
                  }}
                >
                  <Image
                    source={
                      source === 'Telegram'
                        ? require('@/assets/icons/telegram.png')
                        : require('@/assets/icons/tradingview.png')
                    }
                    style={styles.sourceIcon}
                  />
                  <View style={styles.summaryTextContainer}>
                    <Text
                      style={[
                        styles.sourceName,
                        { color: isDark ? '#FFFFFF' : '#000000' },
                      ]}
                    >
                      {source}
                    </Text>
                    <Text
                      style={[
                        styles.summaryText,
                        { color: isDark ? '#8E8E93' : '#8E8E93' },
                      ]}
                    >
                      {summaryText}
                    </Text>
                    <Text
                      style={[
                        styles.timestamp,
                        { color: isDark ? '#8E8E93' : '#8E8E93' },
                      ]}
                    >
                      Latest: {formatTimestamp(latest.received_at)}
                    </Text>
                  </View>
                </TouchableOpacity>
              </Animated.View>
            </GestureDetector>
            <View style={styles.deleteButtonContainer}>
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => handleDeleteSource(source)}
              >
                <Trash2 color="#FFFFFF" size={24} />
              </TouchableOpacity>
            </View>
          </>
        )}
      </Animated.View>
    );
  };

  return (
    <Animated.View
      entering={FadeIn.duration(300)}
      style={[
        styles.container,
        { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF' },
      ]}
    >
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Bell size={24} color={isDark ? '#FFFFFF' : '#000000'} />
          <Text
            style={[
              styles.headerTitle,
              { color: isDark ? '#FFFFFF' : '#000000' },
            ]}
          >
            Notifications
          </Text>
        </View>
      </View>

      <View style={styles.notificationsContainer}>
        {notifications.length === 0 ? (
          <Text
            style={[
              styles.emptyText,
              { color: isDark ? '#8E8E93' : '#8E8E93' },
            ]}
          >
            No notifications yet
          </Text>
        ) : (
          <>
            {renderSourceSummary('Telegram')}
            {renderSourceSummary('TradingView')}
          </>
        )}
      </View>

      <NotificationDetailsModal
        isVisible={isModalVisible}
        onClose={() => setIsModalVisible(false)}
        source={selectedSource}
        notifications={getSourceNotifications(selectedSource)}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2C2C2E',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 8,
  },
  notificationsContainer: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  sourceContainer: {
    marginBottom: 12,
    position: 'relative',
  },
  sourceSummary: {
    borderRadius: 12,
    overflow: 'hidden',
    height: '100%',
    position: 'absolute',
    left: 0,
    right: 0,
  },
  summaryContent: {
    flexDirection: 'row',
    padding: 16,
    alignItems: 'center',
    height: '100%',
  },
  sourceIcon: {
    width: 40,
    height: 40,
    marginRight: 12,
  },
  summaryTextContainer: {
    flex: 1,
  },
  sourceName: {
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 4,
  },
  summaryText: {
    fontSize: 14,
    marginBottom: 4,
  },
  timestamp: {
    fontSize: 12,
  },
  deleteButtonContainer: {
    position: 'absolute',
    right: 0,
    height: '100%',
    width: 80,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FF3B30',
    borderRadius: 12,
  },
  deleteButton: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 16,
    padding: 20,
  },
});