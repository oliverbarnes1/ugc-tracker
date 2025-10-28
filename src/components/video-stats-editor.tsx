import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Edit, Save, X, Undo2 } from 'lucide-react';

interface VideoStats {
  views: number;
  likes: number;
  comments: number;
  shares: number;
  engagement_rate: number;
}

interface VideoStatsEditorProps {
  postId: number;
  initialStats: VideoStats;
  onStatsUpdate: (newStats: VideoStats) => void;
  onClose: () => void;
}

export function VideoStatsEditor({ 
  postId, 
  initialStats, 
  onStatsUpdate, 
  onClose 
}: VideoStatsEditorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [stats, setStats] = useState<VideoStats>(initialStats);
  const [originalStats, setOriginalStats] = useState<VideoStats | null>(null);
  const [hasOriginalStats, setHasOriginalStats] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check if original stats exist for undo functionality
    const checkOriginalStats = async () => {
      try {
        const response = await fetch(`/api/posts/${postId}/stats`);
        const result = await response.json();
        if (result.success) {
          setHasOriginalStats(result.hasOriginalStats);
          if (result.originalStats) {
            setOriginalStats(result.originalStats);
          }
        }
      } catch (err) {
        console.error('Error checking original stats:', err);
      }
    };

    checkOriginalStats();
  }, [postId]);

  const handleEdit = () => {
    setOriginalStats({ ...stats });
    setIsEditing(true);
  };

  const handleSave = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/posts/${postId}/stats`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          views: stats.views,
          likes: stats.likes,
          comments: stats.comments,
          shares: stats.shares,
        }),
      });

      const result = await response.json();

      if (result.success) {
        onStatsUpdate(stats);
        setIsEditing(false);
        setOriginalStats(null);
        setHasOriginalStats(true); // Now we have original stats stored
      } else {
        setError(result.error || 'Failed to update stats');
      }
    } catch (err) {
      setError('Network error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    if (originalStats) {
      setStats(originalStats);
    }
    setIsEditing(false);
    setOriginalStats(null);
    setError(null);
  };

  const handleUndo = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/posts/${postId}/stats`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'undo'
        }),
      });

      const result = await response.json();

      if (result.success) {
        const restoredStats = result.restoredStats;
        setStats({
          views: restoredStats.views,
          likes: restoredStats.likes,
          comments: restoredStats.comments,
          shares: restoredStats.shares,
          engagement_rate: restoredStats.views > 0 ? 
            (restoredStats.likes + restoredStats.comments + restoredStats.shares) / restoredStats.views : 0
        });
        onStatsUpdate({
          views: restoredStats.views,
          likes: restoredStats.likes,
          comments: restoredStats.comments,
          shares: restoredStats.shares,
          engagement_rate: restoredStats.views > 0 ? 
            (restoredStats.likes + restoredStats.comments + restoredStats.shares) / restoredStats.views : 0
        });
        setHasOriginalStats(false); // No more original stats after undo
      } else {
        setError(result.error || 'Failed to undo stats');
      }
    } catch (err) {
      setError('Network error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof VideoStats, value: string) => {
    const numValue = parseInt(value) || 0;
    setStats(prev => ({
      ...prev,
      [field]: numValue,
      engagement_rate: field === 'views' ? 
        (numValue > 0 ? (prev.likes + prev.comments + prev.shares) / numValue : 0) :
        (prev.views > 0 ? (numValue + prev.comments + prev.shares) / prev.views : 0)
    }));
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Edit Video Stats</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="text-red-600 text-sm bg-red-50 p-2 rounded">
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-gray-700">Views</label>
            <input
              type="number"
              value={stats.views}
              onChange={(e) => handleInputChange('views', e.target.value)}
              disabled={!isEditing}
              className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md disabled:bg-gray-100"
              min="0"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Likes</label>
            <input
              type="number"
              value={stats.likes}
              onChange={(e) => handleInputChange('likes', e.target.value)}
              disabled={!isEditing}
              className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md disabled:bg-gray-100"
              min="0"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Comments</label>
            <input
              type="number"
              value={stats.comments}
              onChange={(e) => handleInputChange('comments', e.target.value)}
              disabled={!isEditing}
              className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md disabled:bg-gray-100"
              min="0"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Shares</label>
            <input
              type="number"
              value={stats.shares}
              onChange={(e) => handleInputChange('shares', e.target.value)}
              disabled={!isEditing}
              className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md disabled:bg-gray-100"
              min="0"
            />
          </div>
        </div>

        <div className="text-sm text-gray-600">
          <strong>Engagement Rate:</strong> {(stats.engagement_rate * 100).toFixed(2)}%
        </div>

        <div className="flex space-x-2">
          {!isEditing ? (
            <>
              <Button onClick={handleEdit} size="sm">
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
              {hasOriginalStats && (
                <Button 
                  onClick={handleUndo} 
                  variant="outline" 
                  size="sm"
                  disabled={loading}
                >
                  <Undo2 className="h-4 w-4 mr-2" />
                  {loading ? 'Undoing...' : 'Undo'}
                </Button>
              )}
            </>
          ) : (
            <>
              <Button 
                onClick={handleSave} 
                size="sm" 
                disabled={loading}
              >
                <Save className="h-4 w-4 mr-2" />
                {loading ? 'Saving...' : 'Save'}
              </Button>
              <Button 
                onClick={handleCancel} 
                variant="outline" 
                size="sm"
              >
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
