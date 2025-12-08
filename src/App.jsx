import { useState, useRef, useEffect } from 'react';
import axios from 'axios';

function App() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [productInfo, setProductInfo] = useState({
    product_name: '',
    brand: '',
    SKU: '',
    category: '',
    color: '',
    material: '',
    description: ''
  });
  const [failedImageIndexes, setFailedImageIndexes] = useState([]);
  const [imageLoadingByIndex, setImageLoadingByIndex] = useState({});
  const [imageFilterLoading, setImageFilterLoading] = useState(false);
  
  const fileInputRef = useRef(null);

  // Handle image selection
  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedImage(file);
      setImagePreview(URL.createObjectURL(file));
      setData(null);
      setError(null);
    }
  };

  // Handle drag and drop
  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      setSelectedImage(file);
      setImagePreview(URL.createObjectURL(file));
      setData(null);
      setError(null);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  // Upload and analyze image
  const analyzeImage = async () => {
    if (!selectedImage) {
      setError('Please select an image first');
      return;
    }

    setLoading(true);
    setError(null);
    setImageFilterLoading(true);

    const formData = new FormData();
    formData.append('image', selectedImage);

    try {
      const response = await axios.post(
        'https://darkblue-mink-249537.hostingersite.com/api/image/analyze-with-rest-api',
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            'Accept': 'application/json'
          }
        }
      );
      
      if (response.data.status === 'success') {
        setData(response.data);
        
        // Update product info if available from API
        if (response.data.gpt_response) {
          setProductInfo(prev => ({
            ...prev,
            ...response.data.gpt_response
          }));
        }
        
        setFailedImageIndexes([]);
        setImageLoadingByIndex({});
        
        // Simulate image filtering with delay
        setTimeout(() => {
          setImageFilterLoading(false);
        }, 500);
      } else {
        setError(response.data.message || 'Analysis failed');
        setImageFilterLoading(false);
      }
    } catch (err) {
      console.error('Error analyzing image:', err);
      setError(err.response?.data?.message || 'Failed to analyze image. Please try again.');
      setImageFilterLoading(false);
    } finally {
      setLoading(false);
    }
  };

  // Clear all data
  const clearAll = () => {
    setData(null);
    setSelectedImage(null);
    setImagePreview(null);
    setError(null);
    setProductInfo({
      product_name: '',
      brand: '',
      SKU: '',
      category: '',
      color: '',
      material: '',
      description: ''
    });
    setFailedImageIndexes([]);
    setImageLoadingByIndex({});
    setImageFilterLoading(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Download result as JSON
  const downloadResults = () => {
    if (!data) return;
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'google-vision-analysis-results.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Copy results to clipboard
  const copyResults = async () => {
    if (!data) return;
    
    try {
      await navigator.clipboard.writeText(JSON.stringify(data, null, 2));
      alert('Results copied to clipboard!');
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  // Get current images (similar images only)
  const getCurrentImages = () => {
    if (!data?.data?.web_matches?.similar_images) return [];

    return data.data.web_matches?.similar_images;
  };

  // Count valid images
  const validImagesCount = () => {
    const total = getCurrentImages().length;
    const failed = failedImageIndexes.length;
    return total - failed;
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
      padding: '20px'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '1400px',
        margin: '0 auto',
        background: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(10px)',
        borderRadius: '20px',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.15)',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          padding: '30px 40px',
          background: 'white',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '20px'
        }}>
          <div>
            <h1 style={{
              fontSize: '32px',
              fontWeight: 700,
              marginBottom: '8px',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>
              Google Vision API Analyzer
            </h1>
            <p style={{
              color: '#718096',
              fontSize: '16px'
            }}>
              Upload an image to analyze with Google Cloud Vision API
            </p>
          </div>
          
          {data && (
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={clearAll}
                style={{
                  padding: '10px 20px',
                  background: 'linear-gradient(135deg, #f56565 0%, #e53e3e 100%)',
                  border: 'none',
                  borderRadius: '8px',
                  color: 'white',
                  fontWeight: 600,
                  fontSize: '14px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 8px 25px rgba(245, 101, 101, 0.4)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                🗑️ Clear All
              </button>
            </div>
          )}
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1.5fr',
          gap: '30px',
          padding: '40px',
          minHeight: '600px'
        }}>
          {/* Left Panel - Product Info & Upload */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '30px'
          }}>
            {/* Product Information Card - Always Visible */}
            <div style={{
              background: 'white',
              borderRadius: '12px',
              padding: '25px',
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)',
              border: '1px solid #e2e8f0'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '20px'
              }}>
                <h2 style={{
                  fontSize: '20px',
                  fontWeight: 600,
                  color: '#2d3748',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px'
                }}>
                  <span style={{
                    background: '#667eea',
                    color: 'white',
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '14px'
                  }}>
                    1
                  </span>
                  Product Information
                </h2>
                {data?.gpt_response && (
                  <div style={{
                    fontSize: '12px',
                    color: '#48bb78',
                    background: '#f0fff4',
                    padding: '4px 10px',
                    borderRadius: '12px',
                    fontWeight: 600
                  }}>
                    ✓ Auto-filled from API
                  </div>
                )}
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '15px',
                fontSize: '14px'
              }}>
                <div>
                  <label style={{
                    display: 'block',
                    marginBottom: '6px',
                    fontWeight: 600,
                    color: '#4a5568',
                    fontSize: '13px'
                  }}>
                    Product Name *
                  </label>
                  <input
                    type="text"
                    value={productInfo.product_name}
                    onChange={e => setProductInfo(prev => ({ ...prev, product_name: e.target.value }))}
                    placeholder="Enter product name"
                    style={{
                      color:"black",
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: '1px solid #e2e8f0',
                      fontSize: '14px',
                      transition: 'all 0.2s ease',
                      background: '#fafafa'
                    }}
                    onFocus={e => {
                      e.target.style.borderColor = '#667eea';
                      e.target.style.background = 'white';
                      e.target.style.boxShadow = '0 0 0 3px rgba(102, 126, 234, 0.1)';
                    }}
                    onBlur={e => {
                      e.target.style.borderColor = '#e2e8f0';
                      e.target.style.background = '#fafafa';
                      e.target.style.boxShadow = 'none';
                    }}
                  />
                </div>

                <div>
                  <label style={{
                    display: 'block',
                    marginBottom: '6px',
                    fontWeight: 600,
                    color: '#4a5568',
                    fontSize: '13px'
                  }}>
                    Brand
                  </label>
                  <input
                    type="text"
                    value={productInfo.brand}
                    onChange={e => setProductInfo(prev => ({ ...prev, brand: e.target.value }))}
                    placeholder="Enter brand name"
                    style={{
                      color:"black",
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: '1px solid #e2e8f0',
                      fontSize: '14px',
                      transition: 'all 0.2s ease',
                      background: '#fafafa'
                    }}
                    onFocus={e => {
                      e.target.style.borderColor = '#667eea';
                      e.target.style.background = 'white';
                      e.target.style.boxShadow = '0 0 0 3px rgba(102, 126, 234, 0.1)';
                    }}
                    onBlur={e => {
                      e.target.style.borderColor = '#e2e8f0';
                      e.target.style.background = '#fafafa';
                      e.target.style.boxShadow = 'none';
                    }}
                  />
                </div>

                <div>
                  <label style={{
                    display: 'block',
                    marginBottom: '6px',
                    fontWeight: 600,
                    color: '#4a5568',
                    fontSize: '13px'
                  }}>
                    SKU
                  </label>
                  <input
                    type="text"
                    value={productInfo.SKU}
                    onChange={e => setProductInfo(prev => ({ ...prev, SKU: e.target.value }))}
                    placeholder="Enter SKU"
                    style={{
                      color:"black",
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: '1px solid #e2e8f0',
                      fontSize: '14px',
                      transition: 'all 0.2s ease',
                      background: '#fafafa'
                    }}
                    onFocus={e => {
                      e.target.style.borderColor = '#667eea';
                      e.target.style.background = 'white';
                      e.target.style.boxShadow = '0 0 0 3px rgba(102, 126, 234, 0.1)';
                    }}
                    onBlur={e => {
                      e.target.style.borderColor = '#e2e8f0';
                      e.target.style.background = '#fafafa';
                      e.target.style.boxShadow = 'none';
                    }}
                  />
                </div>

                <div>
                  <label style={{
                    display: 'block',
                    marginBottom: '6px',
                    fontWeight: 600,
                    color: '#4a5568',
                    fontSize: '13px'
                  }}>
                    Category
                  </label>
                  <input
                    type="text"
                    value={productInfo.category}
                    onChange={e => setProductInfo(prev => ({ ...prev, category: e.target.value }))}
                    placeholder="Enter category"
                    style={{
                      color:"black",
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: '1px solid #e2e8f0',
                      fontSize: '14px',
                      transition: 'all 0.2s ease',
                      background: '#fafafa'
                    }}
                    onFocus={e => {
                      e.target.style.borderColor = '#667eea';
                      e.target.style.background = 'white';
                      e.target.style.boxShadow = '0 0 0 3px rgba(102, 126, 234, 0.1)';
                    }}
                    onBlur={e => {
                      e.target.style.borderColor = '#e2e8f0';
                      e.target.style.background = '#fafafa';
                      e.target.style.boxShadow = 'none';
                    }}
                  />
                </div>

                <div>
                  <label style={{
                    display: 'block',
                    marginBottom: '6px',
                    fontWeight: 600,
                    color: '#4a5568',
                    fontSize: '13px'
                  }}>
                    Color
                  </label>
                  <input
                    type="text"
                    value={productInfo.color}
                    onChange={e => setProductInfo(prev => ({ ...prev, color: e.target.value }))}
                    placeholder="Enter color"
                    style={{
                      color:"black",
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: '1px solid #e2e8f0',
                      fontSize: '14px',
                      transition: 'all 0.2s ease',
                      background: '#fafafa'
                    }}
                    onFocus={e => {
                      e.target.style.borderColor = '#667eea';
                      e.target.style.background = 'white';
                      e.target.style.boxShadow = '0 0 0 3px rgba(102, 126, 234, 0.1)';
                    }}
                    onBlur={e => {
                      e.target.style.borderColor = '#e2e8f0';
                      e.target.style.background = '#fafafa';
                      e.target.style.boxShadow = 'none';
                    }}
                  />
                </div>

                <div>
                  <label style={{
                    display: 'block',
                    marginBottom: '6px',
                    fontWeight: 600,
                    color: '#4a5568',
                    fontSize: '13px'
                  }}>
                    Material
                  </label>
                  <input
                    type="text"
                    value={productInfo.material}
                    onChange={e => setProductInfo(prev => ({ ...prev, material: e.target.value }))}
                    placeholder="Enter material"
                    style={{
                      color:"black",
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: '1px solid #e2e8f0',
                      fontSize: '14px',
                      transition: 'all 0.2s ease',
                      background: '#fafafa'
                    }}
                    onFocus={e => {
                      e.target.style.borderColor = '#667eea';
                      e.target.style.background = 'white';
                      e.target.style.boxShadow = '0 0 0 3px rgba(102, 126, 234, 0.1)';
                    }}
                    onBlur={e => {
                      e.target.style.borderColor = '#e2e8f0';
                      e.target.style.background = '#fafafa';
                      e.target.style.boxShadow = 'none';
                    }}
                  />
                </div>

                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{
                    display: 'block',
                    marginBottom: '6px',
                    fontWeight: 600,
                    color: '#4a5568',
                    fontSize: '13px'
                  }}>
                    Description
                  </label>
                  <textarea
                    value={productInfo.description}
                    onChange={e => setProductInfo(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Enter product description"
                    rows={4}
                    style={{
                      color:"black",
                      width: '100%',
                      padding: '12px',
                      borderRadius: '8px',
                      border: '1px solid #e2e8f0',
                      fontSize: '14px',
                      transition: 'all 0.2s ease',
                      background: '#fafafa',
                      resize: 'vertical'
                    }}
                    onFocus={e => {
                      e.target.style.borderColor = '#667eea';
                      e.target.style.background = 'white';
                      e.target.style.boxShadow = '0 0 0 3px rgba(102, 126, 234, 0.1)';
                    }}
                    onBlur={e => {
                      e.target.style.borderColor = '#e2e8f0';
                      e.target.style.background = '#fafafa';
                      e.target.style.boxShadow = 'none';
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Upload Section */}
            <div style={{
              background: 'white',
              borderRadius: '12px',
              padding: '25px',
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)',
              border: '1px solid #e2e8f0'
            }}>
              <h2 style={{
                fontSize: '20px',
                fontWeight: 600,
                color: '#2d3748',
                marginBottom: '20px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
              }}>
                <span style={{
                  background: '#764ba2',
                  color: 'white',
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '14px'
                }}>
                  2
                </span>
                Upload & Analyze
              </h2>
              
              {/* Drop Zone */}
              <div
                onClick={() => fileInputRef.current?.click()}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                style={{
                  border: '2px dashed #cbd5e0',
                  borderRadius: '12px',
                  padding: '40px 20px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  background: '#f7fafc',
                  marginBottom: '20px',
                  position: 'relative'
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = '#667eea';
                  e.currentTarget.style.background = '#edf2f7';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = '#cbd5e0';
                  e.currentTarget.style.background = '#f7fafc';
                }}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleImageSelect}
                  accept="image/*"
                  style={{ display: 'none' }}
                />
                
                <div style={{ fontSize: '48px', marginBottom: '15px' }}>📸</div>
                <div style={{
                  fontSize: '16px',
                  fontWeight: 600,
                  color: '#2d3748',
                  marginBottom: '8px'
                }}>
                  {selectedImage ? 'Click to change image' : 'Drag & drop or click to upload'}
                </div>
                <div style={{
                  fontSize: '14px',
                  color: '#718096'
                }}>
                  Supports JPG, PNG, WebP, etc. (Max 10MB)
                </div>
              </div>

              {/* Image Preview */}
              {imagePreview && (
                <div style={{
                  marginBottom: '20px',
                  textAlign: 'center'
                }}>
                  <div style={{
                    fontSize: '14px',
                    color: '#718096',
                    marginBottom: '10px',
                    textAlign: 'left'
                  }}>
                    Selected Image Preview:
                  </div>
                  <div style={{
                    position: 'relative',
                    display: 'inline-block',
                    maxWidth: '100%'
                  }}>
                    <img
                      src={imagePreview}
                      alt="Preview"
                      style={{
                        maxWidth: '100%',
                        maxHeight: '200px',
                        borderRadius: '8px',
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
                      }}
                    />
                    <button
                      onClick={clearAll}
                      style={{
                        position: 'absolute',
                        top: '-8px',
                        right: '-8px',
                        background: '#f56565',
                        color: 'white',
                        border: 'none',
                        borderRadius: '50%',
                        width: '24px',
                        height: '24px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)'
                      }}
                    >
                      ×
                    </button>
                  </div>
                  <div style={{
                    fontSize: '12px',
                    color: '#718096',
                    marginTop: '8px'
                  }}>
                    {selectedImage?.name} ({(selectedImage?.size / 1024 / 1024).toFixed(2)} MB)
                  </div>
                </div>
              )}

              {/* Analyze Button */}
              <button
                onClick={analyzeImage}
                disabled={loading || !selectedImage}
                style={{
                  width: '100%',
                  padding: '14px',
                  background: loading || !selectedImage 
                    ? '#cbd5e0' 
                    : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  border: 'none',
                  borderRadius: '8px',
                  color: 'white',
                  fontWeight: 600,
                  fontSize: '16px',
                  cursor: loading || !selectedImage ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s ease',
                  opacity: loading || !selectedImage ? 0.7 : 1,
                  position: 'relative',
                  overflow: 'hidden'
                }}
                onMouseEnter={e => {
                  if (!loading && selectedImage) {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 8px 25px rgba(102, 126, 234, 0.4)';
                  }
                }}
                onMouseLeave={e => {
                  if (!loading && selectedImage) {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'none';
                  }
                }}
              >
                {loading ? (
                  <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                    <div style={{
                      width: '16px',
                      height: '16px',
                      border: '2px solid rgba(255,255,255,0.3)',
                      borderTopColor: 'white',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite'
                    }} />
                    Analyzing Image...
                  </span>
                ) : (
                  '🔍 Analyze with Google Vision API'
                )}
              </button>
            </div>
          </div>

          {/* Right Panel - Results */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            background: 'white',
            borderRadius: '12px',
            overflow: 'hidden',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)',
            border: '1px solid #e2e8f0'
          }}>
            {/* Header for Results */}
            <div style={{
              padding: '20px 25px',
              background: 'white',
              borderBottom: '1px solid #e2e8f0',
              fontWeight: 600,
              fontSize: '20px',
              color: '#2d3748',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{
                  background: '#48bb78',
                  color: 'white',
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '14px'
                }}>
                  3
                </span>
                Analysis Results
              </div>
              
              {data && (
                <div style={{
                  fontSize: '14px',
                  color: '#718096',
                  fontWeight: 500
                }}>
                  <span style={{ color: '#48bb78', fontWeight: 600 }}>{validImagesCount()}</span> of {getCurrentImages().length} images found
                </div>
              )}
            </div>

            {/* Results Content */}
            <div style={{
              flex: 1,
              padding: '25px',
              overflowY: 'auto',
              background: '#fafafa',
              minHeight: '400px'
            }}>
              {data ? (
                <>
                  {/* Detected Labels Section */}
                  {data.data.detected_labels?.length > 0 && (
                    <div style={{ marginBottom: '30px' }}>
                      <h3 style={{
                        fontSize: '16px',
                        fontWeight: 600,
                        color: '#4a5568',
                        marginBottom: '15px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}>
                        <div style={{
                          width: '24px',
                          height: '24px',
                          background: '#edf2f7',
                          borderRadius: '6px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '12px',
                          color: '#667eea',
                          fontWeight: 600
                        }}>
                          L
                        </div>
                        Detected Labels ({data.data.detected_labels.length})
                      </h3>
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                        gap: '10px'
                      }}>
                        {data.data.detected_labels
                          .slice(0, 8)
                          .map((label, index) => (
                            <div
                              key={index}
                              style={{
                                background: 'white',
                                padding: '12px',
                                borderRadius: '8px',
                                border: '1px solid #e2e8f0',
                                boxShadow: '0 2px 4px rgba(0, 0, 0, 0.04)'
                              }}
                            >
                              <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                marginBottom: '6px'
                              }}>
                                <span style={{
                                  fontSize: '14px',
                                  fontWeight: 600,
                                  color: '#2d3748'
                                }}>
                                  {label.label}
                                </span>
                                <span style={{
                                  fontSize: '13px',
                                  fontWeight: 700,
                                  color: '#48bb78'
                                }}>
                                  {(label.confidence * 100).toFixed(0)}%
                                </span>
                              </div>
                              <div style={{
                                height: '4px',
                                background: '#e2e8f0',
                                borderRadius: '2px',
                                overflow: 'hidden'
                              }}>
                                <div style={{
                                  width: `${label.confidence * 100}%`,
                                  height: '100%',
                                  background: 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)'
                                }} />
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}

                  {/* Similar Images Section */}
                  <div>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: '15px'
                    }}>
                      <h3 style={{
                        fontSize: '16px',
                        fontWeight: 600,
                        color: '#4a5568',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}>
                        <div style={{
                          width: '24px',
                          height: '24px',
                          background: '#edf2f7',
                          borderRadius: '6px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '12px',
                          color: '#667eea',
                          fontWeight: 600
                        }}>
                          I
                        </div>
                        Similar Images
                      </h3>
                      
                      {imageFilterLoading && (
                        <div style={{
                          fontSize: '14px',
                          color: '#718096',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}>
                          <div style={{
                            width: '12px',
                            height: '12px',
                            border: '2px solid #e2e8f0',
                            borderTopColor: '#667eea',
                            borderRadius: '50%',
                            animation: 'spin 1s linear infinite'
                          }} />
                          Filtering images...
                        </div>
                      )}
                    </div>

                    {getCurrentImages().length > 0 ? (
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                        gap: '15px'
                      }}>
                        {getCurrentImages().map((image, index) => (
                         (
                              <a
                                key={index}
                                href={image}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                  display: 'block',
                                  textDecoration: 'none',
                                  color: 'inherit'
                                }}
                              >
                                <div style={{
                                  background: 'white',
                                  borderRadius: '8px',
                                  overflow: 'hidden',
                                  boxShadow: '0 4px 6px rgba(0, 0, 0, 0.08)',
                                  transition: 'all 0.3s ease',
                                  height: '100%',
                                  border: '1px solid #e2e8f0'
                                }}
                                onMouseEnter={e => {
                                  e.currentTarget.style.transform = 'translateY(-4px)';
                                  e.currentTarget.style.boxShadow = '0 12px 20px rgba(0, 0, 0, 0.12)';
                                  e.currentTarget.style.borderColor = '#cbd5e0';
                                }}
                                onMouseLeave={e => {
                                  e.currentTarget.style.transform = 'translateY(0)';
                                  e.currentTarget.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.08)';
                                  e.currentTarget.style.borderColor = '#e2e8f0';
                                }}
                                >
                                  <div style={{
                                    width: '100%',
                                    height: '150px',
                                    background: '#f8fafc',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    overflow: 'hidden',
                                    position: 'relative'
                                  }}>
                                    {/* Loader while this image is being checked/loaded */}
                                    {imageLoadingByIndex[index] && (
                                      <div style={{
                                        position: 'absolute',
                                        inset: 0,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        background: 'rgba(248, 250, 252, 0.9)',
                                        zIndex: 2
                                      }}>
                                        <div style={{
                                          width: '24px',
                                          height: '24px',
                                          borderRadius: '50%',
                                          border: '3px solid rgba(102, 126, 234, 0.3)',
                                          borderTopColor: '#667eea',
                                          animation: 'spin 1s linear infinite'
                                        }} />
                                      </div>
                                    )}

                                    <img
                                      src={image}
                                      alt={`Similar ${index + 1}`}
                                      style={{
                                        width: '100%',
                                        height: '100%',
                                        objectFit: 'cover',
                                        opacity: imageLoadingByIndex[index] ? 0.4 : 1,
                                        transition: 'opacity 0.2s ease'
                                      }}
                                      loading="lazy"
                                      onLoad={() => {
                                        setImageLoadingByIndex(prev => ({
                                          ...prev,
                                          [index]: false
                                        }));
                                      }}
                                      onError={() => {
                                        setFailedImageIndexes(prev =>
                                          prev.includes(index)
                                            ? prev
                                            : [...prev, index]
                                        );
                                        setImageLoadingByIndex(prev => ({
                                          ...prev,
                                          [index]: false
                                        }));
                                      }}
                                      onLoadStart={() => {
                                        setImageLoadingByIndex(prev => ({
                                          ...prev,
                                          [index]: true
                                        }));
                                      }}
                                    />
                                  </div>
                                  <div style={{
                                    padding: '10px',
                                    fontSize: '11px',
                                    color: '#718096',
                                    borderTop: '1px solid #f1f5f9',
                                    wordBreak: 'break-all',
                                    background: '#fafafa'
                                  }}>
                                    Image {index + 1}
                                  </div>
                                </div>
                              </a>
                            )
                        ))}
                      </div>
                    ) : (
                      <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '40px 20px',
                        color: '#a0aec0',
                        background: '#f8fafc',
                        borderRadius: '8px',
                        border: '1px dashed #e2e8f0'
                      }}>
                        <div style={{ fontSize: '48px', marginBottom: '16px' }}>
                          🔍
                        </div>
                        <div style={{ fontSize: '16px', fontWeight: 600, marginBottom: '8px' }}>
                          No similar images found
                        </div>
                        <div style={{ fontSize: '14px', textAlign: 'center' }}>
                          Google Vision API couldn't find similar images for this upload
                        </div>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '100%',
                  color: '#a0aec0',
                  textAlign: 'center',
                  padding: '60px 20px'
                }}>
                  <div style={{
                    width: '80px',
                    height: '80px',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '36px',
                    color: 'white',
                    marginBottom: '20px',
                    boxShadow: '0 10px 25px rgba(102, 126, 234, 0.3)'
                  }}>
                    🔍
                  </div>
                  <div style={{ fontSize: '22px', fontWeight: 700, marginBottom: '12px', color: '#2d3748' }}>
                    Analysis Results
                  </div>
                  <div style={{ fontSize: '15px', maxWidth: '400px', lineHeight: '1.6', color: '#718096' }}>
                    Upload an image and click "Analyze" to see detailed results from Google Vision API, including similar images and detected labels.
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div style={{
            margin: '0 40px 40px',
            padding: '16px',
            background: '#fed7d7',
            border: '1px solid #fc8181',
            borderRadius: '8px',
            color: '#c53030',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ fontSize: '20px' }}>⚠️</div>
              <div style={{ fontSize: '14px' }}>{error}</div>
            </div>
            <button
              onClick={() => setError(null)}
              style={{
                background: 'none',
                border: 'none',
                color: '#c53030',
                fontSize: '20px',
                cursor: 'pointer',
                padding: '0 8px'
              }}
            >
              ×
            </button>
          </div>
        )}

        {/* Footer */}
        <div style={{
          padding: '20px 40px',
          background: '#f7fafc',
          borderTop: '1px solid #e2e8f0',
          color: '#718096',
          fontSize: '14px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '10px'
        }}>
          <div>
            <strong>Google Vision API Analyzer</strong> • Extract product info, labels, and find similar images
          </div>
          <div style={{ display: 'flex', gap: '15px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <div style={{ width: '10px', height: '10px', background: '#48bb78', borderRadius: '50%' }}></div>
              <span>Real-time analysis</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <div style={{ width: '10px', height: '10px', background: '#667eea', borderRadius: '50%' }}></div>
              <span>Image recognition</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <div style={{ width: '10px', height: '10px', background: '#764ba2', borderRadius: '50%' }}></div>
              <span>Product detection</span>
            </div>
          </div>
        </div>
      </div>

      {/* CSS for spinner animation */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        /* Scrollbar styling */
        ::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        
        ::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 4px;
        }
        
        ::-webkit-scrollbar-thumb {
          background: #c1c1c1;
          border-radius: 4px;
        }
        
        ::-webkit-scrollbar-thumb:hover {
          background: #a8a8a8;
        }
        
        /* Input focus styles */
        input:focus, textarea:focus {
          outline: none;
        }
        
        /* Smooth transitions */
        * {
          transition: background-color 0.2s ease, border-color 0.2s ease, transform 0.2s ease;
        }
      `}</style>
    </div>
  );
}

export default App;