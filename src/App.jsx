import { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import './App.css';
import logo from './assets/app-icon.png'

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
  const [aiGenerateLoading, setAiGenerateLoading] = useState(false);
  const [showSelectedStep, setShowSelectedStep] = useState(false);
  const [showAIImageGenerate, setShowAIImageGenerate] = useState(false);
  const [generatedImage, setGeneratedImage] = useState(null);
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

  const checkNanoBananaStatus = async (taskId) => {
    try {
      const response = await axios.get(`https://darkblue-mink-249537.hostingersite.com/api/nanobanana/record-info?record_id=${taskId}`);
      const responseData = response.data;

      // Check if we have a successful response with data
      if (responseData.code === 200 && responseData.data?.response?.resultImageUrl) {
        const imageUrl = responseData.data.response.resultImageUrl;

        // Update the state with the completed image
        setGeneratedImage(prev => {
          const updated = [...(prev || [])];
          const existingIndex = updated.findIndex(img => img.task_id === taskId);

          if (existingIndex >= 0) {
            updated[existingIndex] = {
              ...updated[existingIndex],
              ...responseData.data,
              url: imageUrl,
              status: 'completed'
            };
          } else {
            updated.push({
              task_id: taskId,
              ...responseData.data,
              url: imageUrl,
              status: 'completed'
            });
          }

          return updated;
        });

        return true; // Stop polling for this task
      }

      // If we get here, the image isn't ready yet
      setGeneratedImage(prev => {
        const updated = [...(prev || [])];
        const existingIndex = updated.findIndex(img => img.task_id === taskId);

        if (existingIndex === -1) {
          updated.push({
            task_id: taskId,
            ...responseData.data,
            status: 'processing'
          });
        } else {
          updated[existingIndex] = {
            ...updated[existingIndex],
            ...responseData.data,
            status: 'processing'
          };
        }

        return updated;
      });

      return false; // Continue polling
    } catch (err) {
      console.error('Error checking status:', err);
      return false; // Continue polling on error
    }
  };

  useEffect(() => {
    let pollInterval;

    return () => {
      if (pollInterval) clearInterval(pollInterval);
    };
  }, []);
  // Upload and analyze image
  const generateImage = async (type) => {
    if (!selectedImage) {
      setError('Please select an image first');
      return;
    }


    setAiGenerateLoading(true);
    setGeneratedImage(null);
    setError(null);
    setShowAIImageGenerate(true);
    setImageFilterLoading(true);
    const formData = new FormData();
    formData.append('image', selectedImage);


    if (type === "nano-banana") {
      try {
        formData.append('prompt', "change the product photo in a professional product image with white background");
        setAiGenerateLoading(true);
        setError(null);
        setShowAIImageGenerate(true);

        // Initial API call to start processing
        const response = await axios.post(
          'https://darkblue-mink-249537.hostingersite.com/api/image/enhance-nano',
          formData,
          {
            headers: {
              'Content-Type': 'multipart/form-data',
              'Accept': 'application/json'
            }
          }
        );
        // Handle the response with multiple tasks
        const results = response.data.results || [];
        if (results.length === 0) {
          throw new Error('No tasks were created');
        }

        // Start polling for each task
        // Start polling for each task
        const pollIntervals = results
          .filter(result => result.task_id != null) // Skip null task_ids
          .map(result => {
            if (result.status === 'error') {
              console.error(`Task ${result.task_id} failed:`, result.error);
              return null;
            }

            // Create a variable to store the interval ID
            const intervalId = setInterval(async () => {
              try {
                const isComplete = await checkNanoBananaStatus(result.task_id);
                if (isComplete) {
                  clearInterval(intervalId); // Use the stored interval ID
                  // Update UI to show completion for this specific angle
                  setGeneratedImage(prev => {
                    const updated = [...(prev || [])];
                    const existingIndex = updated.findIndex(img => img.task_id === result.task_id);
                    if (existingIndex >= 0) {
                      updated[existingIndex].status = 'completed';
                    }
                    return updated;
                  });
                }
              } catch (err) {
                console.error(`Error polling task ${result.task_id}:`, err);
                clearInterval(intervalId); // Use the stored interval ID
              }
            }, 5000); // Poll every 5 seconds

            return intervalId; // Return the interval ID
          })
          .filter(Boolean); // Remove any null intervals from failed tasks

        // Clean up intervals on component unmount
        console.log(generatedImage);
        setAiGenerateLoading(false);
        return () => pollIntervals.forEach(intervalId => clearInterval(intervalId));
      } catch (err) {
        console.error('Error processing with Nano Banana:', err);
        setError(err.response?.data?.message || 'Failed to process image. Please try again.');
        setAiGenerateLoading(false);
      }
    } else if (type == "photoroom-beauty-product") {
      try {
        formData.append('prompt', "change the product photo in a professional product image with white background");
        const response = await axios.post(
          'https://darkblue-mink-249537.hostingersite.com/api/image/enhance-image',
          formData,
          {
            headers: {
              'Content-Type': 'multipart/form-data',
              'Accept': 'application/json'
            }
          }
        );

        setGeneratedImage((response.data.images));


      } catch (err) {
        console.error('Error analyzing image:', err);
        setError(err.response?.data?.message || 'Failed to analyze image. Please try again.');
        setImageFilterLoading(false);
      } finally {
        setAiGenerateLoading(false);
      }
    } else if (type == "gemini-image-1e") {
      try {
        // Array of different prompts or settings for the 4 images
        const prompts = [
          "Product photo with white background, clean and minimalist",
          "Product on a white surface with soft lighting, clean and minimalist",
          "Product with a slight shadow and reflection, professional e-commerce style. white background",
          "Product with a slight 3/4 angle, professional product photography. white background"
        ];

        // Create an array of promises for parallel requests
        // Create an array of promises for parallel requests
        const requests = prompts.map(prompt => {
          // Create a new FormData instance for each request
          const requestFormData = new FormData();

          // Append the existing file
          requestFormData.append('image', formData.get('image'));

          // Append the prompt
          requestFormData.append('prompt', prompt);

          return axios.post(
            'https://darkblue-mink-249537.hostingersite.com/api/image/edit-with-dalle',
            requestFormData,
            {
              headers: {
                'Content-Type': 'multipart/form-data',
                'Accept': 'application/json'
              }
            }
          );
        });

        // Wait for all requests to complete
        const responses = await Promise.all(requests);

        // Format the responses to match your UI structure
        const images = responses
          .filter(response => response.data && response.data.data && response.data.data.image_url)
          .map((response, index) => ({
            id: `img-${Date.now()}-${index}`,
            url: response.data.data.image_url,
            status: 'completed'
          }));

        setGeneratedImage(images);


      } catch (err) {
        console.error('Error analyzing image:', err);
        setError(err.response?.data?.message || 'Failed to analyze image. Please try again.');
        setImageFilterLoading(false);
      } finally {
        setAiGenerateLoading(false);
      }
    } else if (type == "stable-diffusion") {
      try {
        // Array of different prompts or settings for the 4 images
        const prompts = [
          "Product photo with white background, clean and minimalist",
          "Product on a white surface with soft lighting, clean and minimalist",
          "Product with a slight shadow and reflection, professional e-commerce style",
          "Product with a slight 3/4 angle, professional product photography"
        ];

        // Create an array of promises for parallel requests
        // Create an array of promises for parallel requests
        const requests = prompts.map(prompt => {
          // Create a new FormData instance for each request
          const requestFormData = new FormData();

          // Append the existing file
          requestFormData.append('image', formData.get('image'));

          // Append the prompt
          requestFormData.append('prompt', prompt);

          return axios.post(
            'https://darkblue-mink-249537.hostingersite.com/api/image/process-with-stability-ai',
            requestFormData,
            {
              headers: {
                'Content-Type': 'multipart/form-data',
                'Accept': 'application/json'
              }
            }
          );
        });

        // Wait for all requests to complete
        const responses = await Promise.all(requests);

        // Format the responses to match your UI structure
        const images = responses
          .filter(response => response.data && response.data.data && response.data.data.image_url)
          .map((response, index) => ({
            id: `img-${Date.now()}-${index}`,
            url: response.data.data.image_url,
            status: 'completed'
          }));

        setGeneratedImage(images);

      } catch (err) {
        console.error('Error generating images:', err);
        setError(err.response?.data?.message || 'Failed to generate images. Please try again.');
      } finally {
        setAiGenerateLoading(false);
        setImageFilterLoading(false);
      }
    }


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
    setGeneratedImage(null);
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
      {/* Header */}
      <div className="header">
        <div className="header-content">
          <div className="logo">
            <img src={logo} alt="" />
          </div>
          <div className="">
            <h1>Google Vision API Analyzer</h1>
            <p>Upload an image to analyze with Google Cloud Vision API</p>
          </div>
        </div>

        {data && (
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={clearAll}
              className='danger-button'
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="icon icon-tabler icons-tabler-outline icon-tabler-trash"><path stroke="none" d="M0 0h24v24H0z" fill="none" /><path d="M4 7l16 0" /><path d="M10 11l0 6" /><path d="M14 11l0 6" /><path d="M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2 -2l1 -12" /><path d="M9 7v-3a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v3" /></svg>
              Clear All
            </button>
          </div>
        )}
      </div>
      <div className="container">

        <div className="main-content">
          {/* Left Panel - Product Info & Upload */}
          <div className="left-panel">
            {/* Product Information Card - Always Visible */}
            <div className="card">
              <div className="card-header">
                <div className="card-title">
                  <span className="step-number">2</span>
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
              <div className="card-header">
                <div className="card-title">
                  <span className="step-number">1</span>
                  Upload & Analyze
                </div>
              </div>

              <div className="card-body custom-height">
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

                  <div>
                    <svg xmlns="http://www.w3.org/2000/svg" width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="icon icon-tabler icons-tabler-outline icon-tabler-cloud-up"><path stroke="none" d="M0 0h24v24H0z" fill="none" /><path d="M12 18.004h-5.343c-2.572 -.004 -4.657 -2.011 -4.657 -4.487c0 -2.475 2.085 -4.482 4.657 -4.482c.393 -1.762 1.794 -3.2 3.675 -3.773c1.88 -.572 3.956 -.193 5.444 1c1.488 1.19 2.162 3.007 1.77 4.769h.99c1.38 0 2.57 .811 3.128 1.986" /><path d="M19 22v-6" /><path d="M22 19l-3 -3l-3 3" /></svg>
                  </div>
                  <div style={{
                    fontSize: '16px',
                    color: '#99a1af',
                  }}>
                    {selectedImage ? 'Click to change image' : 'Drag & drop or click to upload'}
                  </div>
                  <div style={{
                    fontSize: '14px',
                    color: '#99a1af'
                  }}>
                    Supports JPG, PNG, WebP, etc. (Max 10MB)
                  </div>
                </div>

                {/* Image Preview */}
                {imagePreview && (
                  <div style={{
                    marginBottom: '16px',
                    textAlign: 'center'
                  }}>
                    <div style={{
                      fontSize: '14px',
                      color: '#99a1af',
                      marginBottom: '8px',
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
                          maxHeight: '136px',
                          borderRadius: '8px',
                        }}
                      />
                      <button
                        onClick={clearAll}
                        style={{
                          position: 'absolute',
                          top: '-8px',
                          right: '-8px',
                          background: '##f00',
                          color: 'white',
                          border: 'none',
                          background: '#f00',
                          borderRadius: '3px',
                          width: '24px',
                          height: '24px',
                          cursor: 'pointer',
                          fontSize: '20px',
                          padding: '6px',
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
                      color: '#99a1af',
                      marginTop: '8px'
                    }}>
                      {selectedImage?.name} ({(selectedImage?.size / 1024 / 1024).toFixed(2)} MB)
                    </div>
                  </div>
                )}

                {/* Analyze Button */}
                <div className="button-group">
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
                      <>
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="icon icon-tabler icons-tabler-outline icon-tabler-search"><path stroke="none" d="M0 0h24v24H0z" fill="none" /><path d="M10 10m-7 0a7 7 0 1 0 14 0a7 7 0 1 0 -14 0" /><path d="M21 21l-6 -6" /></svg>
                        Analyze with Google Vision API
                      </>
                    )}
                  </button>
                  <button
                    className="analyze-button"
                    onClick={() => generateImage('nano-banana')}
                    disabled={aiGenerateLoading || !selectedImage}
                  >
                    Generate with Nano Banana
                  </button>
                  <button
                    className="analyze-button"
                    onClick={() => generateImage('photoroom-beauty-product')}
                    disabled={aiGenerateLoading || !selectedImage}
                  >
                    Generate with photoroom Beauty Product
                  </button>
                  <button
                    className="analyze-button"
                    onClick={() => generateImage('stable-diffusion')}
                    disabled={aiGenerateLoading || !selectedImage}
                  >
                    Generate with stable diffusion

                  </button>
                  <button
                    className="analyze-button"
                    onClick={() => generateImage('gemini-image-1e')}
                    disabled={aiGenerateLoading || !selectedImage}
                  >
                    Generate with Gemini Image 1e
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Right Panel - Results */}
          <div className="right-panel">
            <div className="card">
              {/* Header for Results */}
              <div className="card-header">
                <div class="card-title">
                  <span class="step-number">3</span>
                  Product Information
                </div>

                {data && (
                  <div style={{
                    fontSize: '14px',
                    color: '#99a1af',
                    fontWeight: 500
                  }}>
                    <span style={{ color: '#48bb78', fontWeight: 600 }}>{validImagesCount()}</span> of {getCurrentImages().length} images found
                  </div>
                )}
              </div>


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

              {/* Results Content */}
              <div className="results-content">
                <div className="selected-items-step">
                  {aiGenerateLoading ? (
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '16px'
                    }}>
                      <div style={{
                        width: '60px',
                        height: '60px',
                        border: '4px solid #ffffff1a',
                        borderTopColor: '#fff',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite'
                      }} />
                      <p style={{
                        color: '#99a1af',
                        margin: '16px 0 0',
                        textAlign: 'center'
                      }}>
                        Creating your image...<br />
                        This may take a moment
                      </p>
                    </div>
                  ) : (
                    <div style={{
                      width: '100%',
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: '12px',
                      alignItems: 'center'
                    }}>
                      {generatedImage && Array.isArray(generatedImage) && generatedImage.map((image, index) => (
                        <img
                          key={index}
                          src={image.url}
                          alt={`Generated Image ${index + 1}`}
                          style={{
                            maxWidth: '200px',
                            borderRadius: '8px',
                            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
                          }}
                        />
                      ))}
                    </div>
                  )}
                </div>
                {showSelectedStep ? (
                  // Step 3: Show selected images
                  <div className="selected-items-step">
                    <h3 className="section-title">
                      <div className="section-icon">✓</div>
                      Selected Images ({selectedImages.length})
                    </h3>
                    <p style={{ color: '#99a1af', fontSize: '14px', marginBottom: '15px' }}>
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
                              fontSize: '14px',
                              color: '#99a1af',
                              textAlign: 'center',
                              background: '#000'
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
                            fontSize: '15px',
                            color: '#99a1af',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                          }}>
                            <div className="spinner" style={{ borderColor: '#ffffff1a', borderTopColor: '#fff' }} />
                            Filtering images...
                          </div>
                        )}
                      </div>

                      {getCurrentImages().length > 0 ? (
                        <div>
                          <div style={{
                            padding: '15px',
                            background: '#12b25545',
                            borderRadius: '8px',
                            marginBottom: '20px',
                            border: '1px solid #12b255'
                          }}>
                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between'
                            }}>
                              <div style={{ fontSize: '14px', color: '#12b255' }}>
                                Found {validImagesCount()} images. Please click the button below to view and select images.
                              </div>
                              <button
                                onClick={() => setShowModal(true)}
                                className='primary-button'
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="icon icon-tabler icons-tabler-outline icon-tabler-aperture"><path stroke="none" d="M0 0h24v24H0z" fill="none" /><path d="M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0 -18 0" /><path d="M3.6 15h10.55" /><path d="M6.551 4.938l3.26 10.034" /><path d="M17.032 4.636l-8.535 6.201" /><path d="M20.559 14.51l-8.535 -6.201" /><path d="M12.257 20.916l3.261 -10.034" /></svg>
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
                    color: '#99a1af',
                    textAlign: 'center',
                    padding: '20px 0'
                  }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      marginBottom: '12px',
                    }}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="icon icon-tabler icons-tabler-outline icon-tabler-search"><path stroke="none" d="M0 0h24v24H0z" fill="none" /><path d="M10 10m-7 0a7 7 0 1 0 14 0a7 7 0 1 0 -14 0" /><path d="M21 21l-6 -6" /></svg>
                    </div>
                    <div style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px', color: '#99a1af' }}>
                      Analysis Results
                    </div>
                    <div style={{ fontSize: '15px', maxWidth: '400px', lineHeight: '1.3', color: '#99a1af' }}>
                      Upload an image and click "Analyze" to see detailed results from Google Vision API, including similar images and detected labels.
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* {showAIImageGenerate && (
        <div className="modal-overlay" style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div className="modal-content" style={{
            backgroundColor: '#1a202c',
            borderRadius: '12px',
            width: '90%',
            maxWidth: '600px',
            maxHeight: '90vh',
            overflow: 'auto',
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)'
          }}>
            <div className="modal-header" style={{
              padding: '16px 24px',
              borderBottom: '1px solid #2d3748',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <h3 style={{
                color: 'Black',
                margin: 0,
                fontSize: '1.25rem',
                fontWeight: 600
              }}>
                {aiGenerateLoading ? 'Generating Your Image' : 'Image Ready!'}
              </h3>
              <button
                onClick={() => setShowAIImageGenerate(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#a0aec0',
                  fontSize: '1.5rem',
                  cursor: 'pointer',
                  padding: '4px 12px',
                  borderRadius: '4px',
                  transition: 'all 0.2s',
                  ':hover': {
                    color: 'white',
                    backgroundColor: 'rgba(255, 255, 255, 0.1)'
                  }
                }}
              >
                &times;
              </button>
            </div>
            <div className="modal-body" style={{
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: '300px'
            }}>
              
            </div>
          </div>
        </div>
      )} */}

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
                  color: '#fff',
                  padding: '6px 12px'
                }}
              >
                ×
              </button>
            </div>

            <div className="modal-body">
              <p style={{ color: '#fff', fontSize: '15px', marginBottom: '20px', marginTop: '0px' }}>
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
                              background: '#12b255',
                              color: 'white',
                              width: '24px',
                              height: '24px',
                              borderRadius: '50%',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '18px',
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
                          color: '#99a1af',
                          textAlign: 'center',
                          background: '#000',
                          borderTop: '1px solid #ffffff1a'
                        }}>
                          Image {index + 1}
                          {isSelected && (
                            <span style={{ color: '#12b255', marginLeft: '5px' }}>
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
                  color: '#fff'
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
                  className='secondary-button'
                >
                  Cancel
                </button>
                <button
                  onClick={handleModalNext}
                  className='primary-button'
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