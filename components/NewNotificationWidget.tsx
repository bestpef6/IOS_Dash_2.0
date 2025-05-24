import React, { useState, useEffect, useCallback } from 'react';
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
} from 'react-native-reanimated';
import { Trash2 } from 'lucide-react-native';
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
  const translateX = useSharedValue(0);
  const deleteButtonWidth = 80;

  useEffect(() => {
    // In production, this would fetch from the API
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
      console.log(`Deleting notifications for ${source}`);
      setNotifications((prev) =>
        prev.filter((notification) => notification.source !== source)
      );
      translateX.value = withSpring(0);
    },
    [translateX]
  );

  const gesture = Gesture.Pan()
    .activeOffsetX(-10)
    .onUpdate((event) => {
      const newValue = Math.min(0, Math.max(-deleteButtonWidth, event.translationX));
      translateX.value = newValue;
    })
    .onEnd(() => {
      const shouldDelete = translateX.value < -deleteButtonWidth / 2;
      if (shouldDelete) {
        runOnJS(handleDeleteSource)(selectedSource);
      } else {
        translateX.value = withSpring(0);
      }
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const renderSourceSummary = (source: string) => {
    const sourceNotifications = getSourceNotifications(source);
    if (sourceNotifications.length === 0) return null;

    const latest = getLatestNotification(source);
    const uniqueChats =
      source === 'Telegram'
        ? new Set(sourceNotifications.map((n) => n.chat_title)).size
        : null;

    const summaryText =
      source === 'Telegram'
        ? `${sourceNotifications.length} new messages from ${uniqueChats} distinct chats`
        : `${sourceNotifications.length} new alerts`;

    return (
      <View key={source} style={styles.sourceContainer}>
        <GestureDetector gesture={gesture}>
          <Animated.View
            style={[
              styles.sourceSummary,
              {
                backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
              },
              animatedStyle,
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
            style={[styles.deleteButton]}
            onPress={() => handleDeleteSource(source)}
          >
            <Trash2 color="#FFFFFF" size={24} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (notifications.length === 0) {
    return (
      <View
        style={[
          styles.container,
          { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF' },
        ]}
      >
        <Text
          style={[
            styles.emptyText,
            { color: isDark ? '#8E8E93' : '#8E8E93' },
          ]}
        >
          No notifications yet
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {renderSourceSummary('Telegram')}
      {renderSourceSummary('TradingView')}
      <NotificationDetailsModal
        isVisible={isModalVisible}
        onClose={() => setIsModalVisible(false)}
        source={selectedSource}
        notifications={getSourceNotifications(selectedSource)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
  },
  sourceContainer: {
    marginBottom: 12,
    position: 'relative',
    height: 100,
  },
  sourceSummary: {
    borderRadius: 12,
    overflow: 'hidden',
    height: '100%',
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