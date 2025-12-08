import { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import './App.css';

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
  
  // New states for modal and multi-select
  const [showModal, setShowModal] = useState(false);
  const [selectedImages, setSelectedImages] = useState([]);
  const [showSelectedStep, setShowSelectedStep] = useState(false);
  
  const fileInputRef = useRef(null);

  // Handle image selection
  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedImage(file);
      setImagePreview(URL.createObjectURL(file));
      setData(null);
      setError(null);
      setSelectedImages([]);
      setShowSelectedStep(false);
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
      setSelectedImages([]);
      setShowSelectedStep(false);
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
        setSelectedImages([]);
        setShowSelectedStep(false);
        
        // Open modal to show images for selection
        setTimeout(() => {
          setImageFilterLoading(false);
          setShowModal(true);
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

  // Toggle image selection in modal
  const toggleImageSelection = (imageUrl, index) => {
    setSelectedImages(prev => {
      const isSelected = prev.some(img => img.url === imageUrl);
      if (isSelected) {
        return prev.filter(img => img.url !== imageUrl);
      } else {
        return [...prev, { url: imageUrl, index }];
      }
    });
  };

  // Handle next button in modal
  const handleModalNext = () => {
    setShowModal(false);
    setShowSelectedStep(true);
  };

  // Remove selected image from step 3
  const removeSelectedImage = (imageUrl) => {
    setSelectedImages(prev => prev.filter(img => img.url !== imageUrl));
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
    setSelectedImages([]);
    setShowModal(false);
    setShowSelectedStep(false);
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
    if (!data?.data?.web_matches?.similar_images && !data?.data?.web_matches?.partial_matches && !data?.data?.full_matches) return [];
    
    const responseData = [...data?.data?.web_matches?.similar_images, ...data?.data?.web_matches?.partial_matches, ...data?.data?.web_matches?.full_matches]

    console.log("ResponseData: ", responseData);
    
    
    return responseData;
  };

  // Count valid images
  const validImagesCount = () => {
    const total = getCurrentImages().length;
    const failed = failedImageIndexes.length;
    return total - failed;
  };

  return (
    <div className="vision-analyzer-app">
      <div className="container">
        {/* Header */}
        <div className="header">
          <div className="header-content">
            <h1>Google Vision API Analyzer</h1>
            <p>Upload an image to analyze with Google Cloud Vision API</p>
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

        <div className="main-content">
          {/* Left Panel - Product Info & Upload */}
          <div className="left-panel">
            {/* Product Information Card - Always Visible */}
            <div className="card">
              <div className="card-header">
                <div className="card-title">
                  <span className="step-number">1</span>
                  Product Information
                </div>
                {data?.gpt_response && (
                  <div className="auto-filled">
                    ✓ Auto-filled from API
                  </div>
                )}
              </div>

              <div className="form-grid">
                <div>
                  <label>Product Name *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={productInfo.product_name}
                    onChange={e => setProductInfo(prev => ({ ...prev, product_name: e.target.value }))}
                    placeholder="Enter product name"
                  />
                </div>

                <div>
                  <label>Brand</label>
                  <input
                    type="text"
                    className="form-input"
                    value={productInfo.brand}
                    onChange={e => setProductInfo(prev => ({ ...prev, brand: e.target.value }))}
                    placeholder="Enter brand name"
                  />
                </div>

                <div>
                  <label>SKU</label>
                  <input
                    type="text"
                    className="form-input"
                    value={productInfo.SKU}
                    onChange={e => setProductInfo(prev => ({ ...prev, SKU: e.target.value }))}
                    placeholder="Enter SKU"
                  />
                </div>

                <div>
                  <label>Category</label>
                  <input
                    type="text"
                    className="form-input"
                    value={productInfo.category}
                    onChange={e => setProductInfo(prev => ({ ...prev, category: e.target.value }))}
                    placeholder="Enter category"
                  />
                </div>

                <div>
                  <label>Color</label>
                  <input
                    type="text"
                    className="form-input"
                    value={productInfo.color}
                    onChange={e => setProductInfo(prev => ({ ...prev, color: e.target.value }))}
                    placeholder="Enter color"
                  />
                </div>

                <div>
                  <label>Material</label>
                  <input
                    type="text"
                    className="form-input"
                    value={productInfo.material}
                    onChange={e => setProductInfo(prev => ({ ...prev, material: e.target.value }))}
                    placeholder="Enter material"
                  />
                </div>

                <div className="textarea-full">
                  <label>Description</label>
                  <textarea
                    className="form-input"
                    value={productInfo.description}
                    onChange={e => setProductInfo(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Enter product description"
                    rows={4}
                    style={{ resize: 'vertical' }}
                  />
                </div>
              </div>
            </div>

            {/* Upload Section */}
            <div className="card">
              <div className="card-title">
                <span className="step-number" style={{ background: '#764ba2' }}>2</span>
                Upload & Analyze
              </div>
              
              {/* Drop Zone */}
              <div
                className="drop-zone"
                onClick={() => fileInputRef.current?.click()}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
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
                className="analyze-button"
                onClick={analyzeImage}
                disabled={loading || !selectedImage}
              >
                {loading ? (
                  <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                    <div className="spinner" />
                    Analyzing Image...
                  </span>
                ) : (
                  '🔍 Analyze with Google Vision API'
                )}
              </button>
            </div>
          </div>

          {/* Right Panel - Results */}
          <div className="right-panel">
            {/* Header for Results */}
            <div className="results-header">
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
            <div className="results-content">
              {showSelectedStep ? (
                // Step 3: Show selected images
                <div className="selected-items-step">
                  <h3 className="section-title">
                    <div className="section-icon">✓</div>
                    Selected Images ({selectedImages.length})
                  </h3>
                  <p style={{ color: '#718096', fontSize: '14px', marginBottom: '15px' }}>
                    These are the images you selected from the modal. You can remove any image by clicking the X button.
                  </p>
                  
                  {selectedImages.length > 0 ? (
                    <div className="selected-items-grid">
                      {selectedImages.map((image, index) => (
                        <div key={index} className="selected-item">
                          <button
                            className="remove-selected"
                            onClick={() => removeSelectedImage(image.url)}
                          >
                            ×
                          </button>
                          <div className="image-container">
                            <img
                              src={image.url}
                              alt={`Selected ${index + 1}`}
                              style={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover'
                              }}
                            />
                          </div>
                          <div style={{
                            padding: '8px',
                            fontSize: '12px',
                            color: '#718096',
                            textAlign: 'center',
                            background: '#fafafa'
                          }}>
                            Image {image.index + 1}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{
                      padding: '40px 20px',
                      textAlign: 'center',
                      color: '#a0aec0',
                      background: '#f8fafc',
                      borderRadius: '8px',
                      border: '1px dashed #e2e8f0'
                    }}>
                      <div style={{ fontSize: '48px', marginBottom: '16px' }}>
                        🖼️
                      </div>
                      <div style={{ fontSize: '16px', fontWeight: 600, marginBottom: '8px' }}>
                        No images selected
                      </div>
                      <div style={{ fontSize: '14px' }}>
                        Go back to the modal to select images
                      </div>
                      <button
                        onClick={() => {
                          setShowSelectedStep(false);
                          setShowModal(true);
                        }}
                        style={{
                          marginTop: '20px',
                          padding: '10px 20px',
                          background: '#667eea',
                          color: 'white',
                          border: 'none',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          fontWeight: 600
                        }}
                      >
                        Open Modal Again
                      </button>
                    </div>
                  )}
                </div>
              ) : data ? (
                <>
                  {/* Detected Labels Section */}
                  {data.data.detected_labels?.length > 0 && (
                    <div className="labels-section">
                      <h3 className="section-title">
                        <div className="section-icon">L</div>
                        Detected Labels ({data.data.detected_labels.length})
                      </h3>
                      <div className="labels-grid">
                        {data.data.detected_labels
                          .slice(0, 8)
                          .map((label, index) => (
                            <div key={index} className="label-card">
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

                  {/* Images Found Summary */}
                  <div>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: '15px'
                    }}>
                      <h3 className="section-title">
                        <div className="section-icon">I</div>
                        Images Found ({getCurrentImages().length})
                      </h3>
                      
                      {imageFilterLoading && (
                        <div style={{
                          fontSize: '14px',
                          color: '#718096',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}>
                          <div className="spinner" style={{ borderTopColor: '#667eea', borderColor: '#e2e8f0' }} />
                          Filtering images...
                        </div>
                      )}
                    </div>

                    {getCurrentImages().length > 0 ? (
                      <div>
                        <div style={{
                          padding: '15px',
                          background: '#edf2f7',
                          borderRadius: '8px',
                          marginBottom: '20px',
                          border: '1px solid #cbd5e0'
                        }}>
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between'
                          }}>
                            <div style={{ fontSize: '14px', color: '#4a5568' }}>
                              Found {validImagesCount()} images. Please click the button below to view and select images.
                            </div>
                            <button
                              onClick={() => setShowModal(true)}
                              style={{
                                padding: '10px 20px',
                                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                border: 'none',
                                borderRadius: '8px',
                                color: 'white',
                                fontWeight: 600,
                                fontSize: '14px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px'
                              }}
                            >
                              <span>🖼️</span>
                              View & Select Images
                            </button>
                          </div>
                        </div>
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
          <div className="error-display">
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
        <div className="footer">
          <div>
            <strong>Google Vision API Analyzer</strong> • Extract product info, labels, and find similar images
          </div>
          <div style={{ display: 'flex', gap: '15px' }}>
            <div className="status-indicator">
              <div className="indicator-dot" style={{ background: '#48bb78' }}></div>
              <span>Real-time analysis</span>
            </div>
            <div className="status-indicator">
              <div className="indicator-dot" style={{ background: '#667eea' }}></div>
              <span>Image recognition</span>
            </div>
            <div className="status-indicator">
              <div className="indicator-dot" style={{ background: '#764ba2' }}></div>
              <span>Product detection</span>
            </div>
          </div>
        </div>
      </div>

      {/* Modal for Image Selection */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Select Images ({selectedImages.length} selected)</h2>
              <button
                onClick={() => setShowModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: '#718096'
                }}
              >
                ×
              </button>
            </div>
            
            <div className="modal-body">
              <p style={{ color: '#718096', fontSize: '14px', marginBottom: '20px' }}>
                Select the images you want to include in step 3. Click on any image to select/deselect it.
              </p>
              
              {getCurrentImages().length > 0 ? (
                <div className="modal-images-grid">
                  {getCurrentImages().map((image, index) => {
                    const isSelected = selectedImages.some(img => img.url === image && img.index === index);
                    const isLoading = imageLoadingByIndex[index];
                    const isFailed = failedImageIndexes.includes(index);
                    
                    return (
                      <div
                        key={index}
                        className={`modal-image-item ${isSelected ? 'selected' : ''}`}
                        onClick={() => !isLoading && !isFailed && toggleImageSelection(image, index)}
                      >
                        <div className="image-container">
                          {isLoading && (
                            <div style={{
                              position: 'absolute',
                              inset: 0,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              background: 'rgba(248, 250, 252, 0.9)',
                              zIndex: 2
                            }}>
                              <div className="image-spinner" />
                            </div>
                          )}
                          
                          <img
                            src={image}
                            alt={`Similar ${index + 1}`}
                            style={{
                              width: '100%',
                              height: '100%',
                              objectFit: 'cover',
                              opacity: isLoading ? 0.4 : 1
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
                          
                          {isSelected && (
                            <div style={{
                              position: 'absolute',
                              top: '10px',
                              right: '10px',
                              background: '#48bb78',
                              color: 'white',
                              width: '24px',
                              height: '24px',
                              borderRadius: '50%',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '14px',
                              fontWeight: 'bold'
                            }}>
                              ✓
                            </div>
                          )}
                          
                          {isFailed && (
                            <div style={{
                              position: 'absolute',
                              inset: 0,
                              background: 'rgba(254, 215, 215, 0.9)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#c53030',
                              fontWeight: '600'
                            }}>
                              Failed to load
                            </div>
                          )}
                        </div>
                        <div style={{
                          padding: '10px',
                          fontSize: '13px',
                          color: '#718096',
                          textAlign: 'center',
                          background: '#fafafa',
                          borderTop: '1px solid #f1f5f9'
                        }}>
                          Image {index + 1}
                          {isSelected && (
                            <span style={{ color: '#48bb78', marginLeft: '5px' }}>
                              ✓ Selected
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div style={{
                  padding: '40px 20px',
                  textAlign: 'center',
                  color: '#a0aec0'
                }}>
                  No images available for selection
                </div>
              )}
            </div>
            
            <div className="modal-footer">
              <div className="selected-count">
                {selectedImages.length} image(s) selected
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={() => setShowModal(false)}
                  style={{
                    padding: '10px 20px',
                    background: '#e2e8f0',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#4a5568',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleModalNext}
                  style={{
                    padding: '10px 20px',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    border: 'none',
                    borderRadius: '8px',
                    color: 'white',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Next → Show in Step 3
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;