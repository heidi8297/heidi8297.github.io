
//----------------------------------------------------------------------------
//  DEFINE VARIABLES
//----------------------------------------------------------------------------

let canvasWidth = 2000;
let canvasHeight = 1600;
let circleData = [];

// variables needed for transition method
let circleStartInfo = {};
let circleEndInfo = {};
const ease = d3.easeCubicInOut;
const setDuration = 2000;
let timeElapsed = 0;
let interpolators = null;

var customBase = document.createElement('custom');
var custom = d3.select(customBase); // This is your SVG replacement and the parent of all other elements


// Color scale: give me a number, I return a color
const colorByNum = d3.scaleOrdinal()
	.domain([0,1,2,3,4,5,6,7,8,9,10,11,12])
	.range(["#FFEE88","#FFEE88","#ffcc6d","#FFAC69","#ff9473","#fe8187","#e278d6","#ad8aff",
		"#7c97ff","#66B9FF","#77DBFD","#83E8D0","#C3E6A6"]);

// used to create semi-randomness in the color order
let colorOffset = 12*Math.random();

let canvas = d3.select('#viz-container')
  .append('canvas')
  .attr('width', canvasWidth)
  .attr('height', canvasHeight);

let context = canvas.node().getContext('2d');

let svgForeground = d3.select("#viz-container").append('svg')
	.attr('width', canvasWidth)
	.attr('height', canvasHeight)
	.attr("class", "svgForeground"); // this is purely to make it easy to see in 'inspect'

//svgForeground.append()

var shoeImg = document.getElementById('ombre-shoe');
var shoeCanvas = document.createElement('canvas');
shoeCanvas.width = shoeImg.width;
shoeCanvas.height = shoeImg.height;
shoeCanvas.getContext('2d').drawImage(shoeImg, 0, 0, shoeImg.width, shoeImg.height);


let stats = new Stats();
stats.setMode(0); // 0: fps, 1: ms, 2: mb

// align top-left
stats.domElement.style.position = 'fixed';
stats.domElement.style.left = '0px';
stats.domElement.style.top = '0px';

document.body.appendChild( stats.domElement );


//----------------------------------------------------------------------------
//  MOVE TO ZERO POLYGON
//----------------------------------------------------------------------------

let mtzPoints="3653,7218.8 3639.2,7210.2 3626.2,7200.1 3613.8,7188.6 3602.3,7175.7 3591.6,7161.4 3581.7,7145.9 3572.6,7129.1 3564.3,7111 3557,7091.7 3550.5,7071.3 3544.9,7049.8 3540.3,7027.1 3536.7,7003.4 3534,6978.7 3533,6966 3527,6888 3486,6893 3455.8,6896.9 3396.6,6903.8 3339.4,6909.2 3284.5,6913.1 3232.5,6915.5 3183.7,6916.5 3138.7,6915.8 3097.8,6913.7 3079,6912 3056.5,6909.5 3015.8,6903.9 2980.3,6897.6 2949.3,6890.2 2922.1,6881.5 2898,6871.5 2876.4,6859.8 2856.5,6846.4 2847,6839 2838.2,6831.3 2822.4,6815.9 2809.3,6800.2 2798.6,6784 2790.2,6767 2784.1,6749 2780.2,6729.8 2778.2,6709 2778,6698 2778.2,6691.9 2779.2,6679.5 2782.1,6660.6 2788.7,6634.8 2798.4,6608.6 2811.1,6582.1 2826.6,6555.4 2845.1,6528.7 2866.3,6502.2 2878,6489 2930,6432 2809,6334 2791.2,6319.5 2757,6290.6 2724.5,6261.9 2693.8,6233.6 2665,6205.5 2638.2,6177.9 2613.3,6150.7 2590.4,6124.1 2569.6,6098 2550.9,6072.6 2534.4,6047.9 2520,6023.9 2507.9,6000.8 2498.1,5978.5 2490.7,5957.1 2485.6,5936.8 2484,5927 2482.5,5913.8 2481.3,5888.4 2482.8,5864.5 2486.8,5842 2493.3,5821.1 2502.4,5801.6 2513.9,5783.7 2528,5767.2 2544.4,5752.4 2563.3,5739.1 2584.5,5727.4 2608.1,5717.3 2634.1,5708.8 2662.4,5701.9 2692.9,5696.7 2725.7,5693.1 2743,5692 2832,5687 2826,5656 2821.3,5628.2 2813.4,5567.6 2807.3,5502.5 2803.2,5435.1 2801.1,5368 2800.9,5303.5 2802.9,5244.2 2805.8,5204.5 2808.5,5180.8 2810,5170 2812.9,5154.3 2820.6,5123.2 2830.4,5093.1 2842.2,5064.3 2855.7,5037.4 2870.7,5012.9 2886.9,4991.2 2899.7,4977.1 2908.5,4968.8 2913,4965 2919.1,4960.4 2930.3,4952.6 2940.6,4946.5 2950.7,4942 2961.3,4938.8 2973.2,4936.7 2994.9,4935.2 3013,4935 3027.4,4935.3 3048.3,4937.1 3061.9,4939.2 3075.1,4942 3088.2,4945.6 3101.2,4949.9 3114.1,4955.1 3133.4,4964.4 3159.3,4979.9 3185.9,4999 3213.6,5022 3228,5035 3285,5088 3314,5048 3325.3,5032.4 3348.8,5001.3 3373.2,4970.4 3398.5,4939.9 3424.4,4910 3450.7,4880.7 3477.2,4852.4 3503.8,4825.3 3530.2,4799.3 3556.3,4774.9 3581.9,4752.1 3606.8,4731.1 3630.7,4712.1 3653.7,4695.3 3675.3,4680.8 3695.5,4668.9 3705,4664 3711.1,4661.2 3723.6,4656 3743.3,4649.4 3770.6,4642.9 3798.3,4639 3825.8,4637.7 3852.1,4639 3870.7,4641.7 3882.3,4644.4 3893.2,4647.7 3903.3,4651.7 3908,4654 3914.3,4657.4 3926.4,4665.1 3937.8,4674 3948.6,4684 3958.7,4695.1 3968.1,4707.3 3976.9,4720.6 3985,4735.1 3992.4,4750.7 3999.1,4767.3 4005.1,4785.1 4010.5,4803.9 4015.2,4823.8 4019.1,4844.8 4022.4,4866.9 4025,4890 4026,4902 4033,4982 4074,4977 4096.9,4974 4142,4968.7 4186.3,4964.2 4229.5,4960.6 4271.5,4957.9 4312.3,4956 4351.7,4955 4389.7,4954.9 4425.9,4955.6 4460.5,4957.1 4493.1,4959.6 4523.8,4962.8 4552.4,4966.9 4578.7,4971.9 4602.7,4977.7 4624.2,4984.4 4634,4988 4642.2,4991.3 4658,4998.4 4672.8,5006 4686.6,5014.1 4699.6,5022.7 4711.5,5031.7 4722.6,5041.2 4732.6,5051.1 4741.8,5061.5 4749.9,5072.2 4757.2,5083.3 4763.4,5094.8 4768.7,5106.6 4773,5118.8 4776.4,5131.3 4778.8,5144.1 4780.2,5157.2 4780.7,5170.6 4780.2,5184.2 4778.7,5198.1 4776.2,5212.2 4772.8,5226.6 4768.3,5241.1 4762.9,5255.8 4756.5,5270.7 4749.2,5285.7 4740.8,5300.9 4731.4,5316.1 4721.1,5331.5 4709.7,5347 4690.8,5370.4 4677,5386 4627,5441 4649,5457 4662,5466.1 4690.9,5487.5 4722.7,5512.3 4756.1,5539.5 4806.3,5582.1 4852.8,5623.6 4879.4,5648.7 4891,5660 4906.7,5676 4935.9,5707 4962.4,5737 4986,5765.8 5006.9,5793.7 5025.1,5820.6 5040.6,5846.6 5053.5,5871.7 5063.6,5896.1 5071.2,5919.8 5076.1,5942.7 5078.5,5965.1 5078.3,5987 5075.6,6008.3 5070.4,6029.3 5062.8,6049.8 5058,6060 5054.2,6067.1 5045.6,6080.8 5035.8,6093.6 5024.7,6105.6 5012.5,6116.7 4999.1,6127 4984.6,6136.4 4969.1,6144.9 4952.4,6152.6 4934.8,6159.3 4916.1,6165.1 4896.5,6170 4875.9,6173.9 4854.4,6176.9 4832.1,6178.9 4808.9,6179.9 4797,6180 4728,6180 4734,6218 4737.7,6242.2 4744.2,6290.1 4749.6,6337.3 4753.8,6383.5 4756.8,6428.7 4758.8,6472.6 4759.5,6515.1 4759.2,6556 4757.8,6595.3 4755.2,6632.6 4751.5,6667.9 4746.8,6701.1 4740.9,6731.9 4734,6760.2 4726,6785.8 4716.9,6808.7 4712,6819 4708.3,6826 4700.7,6839.4 4692.7,6852 4684.2,6863.7 4675.4,6874.6 4666.2,6884.6 4656.7,6893.8 4646.8,6902.1 4636.6,6909.6 4626.1,6916.2 4615.3,6922 4604.2,6926.9 4592.8,6931 4581.2,6934.3 4569.3,6936.6 4557.3,6938.2 4544.9,6938.9 4532.4,6938.7 4519.7,6937.7 4506.9,6935.8 4493.9,6933 4480.7,6929.5 4467.4,6925 4454,6919.7 4433.6,6910.1 4406.2,6894.4 4378.6,6875.2 4350.9,6852.6 4337,6840 4275,6782 4246,6822 4234.9,6837.3 4211.7,6868 4187.4,6898.6 4162.2,6929 4136.3,6958.9 4110,6988.2 4083.4,7016.6 4056.7,7043.9 4030.1,7070 4003.9,7094.7 3978.1,7117.7 3953.1,7138.8 3929.1,7158 3906.1,7174.9 3884.5,7189.3 3864.4,7201.1 3855,7206 3843.7,7211 3820.2,7219.8 3795.8,7226.8 3771.2,7231.8 3747,7234.9 3723.9,7236 3702.5,7234.8 3683.5,7231.5 3675,7229 3675,7229 4076,6890 4082.6,6887.5 4096.8,6881.5 4120.1,6869.9 4152.5,6851 4176.3,6835.3 4191.1,6824.4 4198,6819 4260,6769 4206,6692 4182,6656.8 4142.8,6597.6 4119.5,6560.8 4110,6545 4096,6521.5 4057.7,6453.9 4009.9,6367 3957.8,6270.3 3906.5,6173.4 3861,6085.8 3826.3,6017.3 3810.6,5984.1 3806.2,5972.9 3806,5971 3807.5,5971.6 3816.9,5979.2 3845.5,6005.1 3905.6,6062.2 3984.1,6138.6 4028,6182 4068.2,6221.7 4138.5,6290.4 4197.2,6346.2 4246.3,6391 4288.1,6426.5 4324.5,6454.5 4357.6,6477 4389.7,6495.6 4406,6504 4413.4,6507.6 4427.9,6513.9 4442.1,6519.2 4456.1,6523.4 4469.7,6526.6 4483.1,6528.8 4496.1,6529.9 4508.8,6530 4521.1,6529 4533.2,6527.1 4544.9,6524.1 4556.3,6520.2 4567.3,6515.2 4577.9,6509.3 4588.2,6502.4 4598.2,6494.4 4607.7,6485.6 4616.9,6475.7 4625.7,6464.9 4634.1,6453.1 4642.1,6440.4 4649.8,6426.8 4657,6412.2 4663.8,6396.7 4673.2,6371.6 4684.2,6335.1 4693.5,6294.9 4701,6251.2 4704,6228 4705.6,6213.3 4706.6,6197.4 4706.1,6190.2 4704.6,6185.3 4701.9,6182.3 4697.9,6180.7 4692.4,6180.1 4689,6180 4683,6179.8 4668.1,6178.5 4638.5,6174.1 4587.1,6164.1 4524,6150 4451.4,6132.2 4371.2,6111.3 4285.7,6087.8 4196.9,6062.3 4152,6049 3953.6,5988.9 3852,5958 3845.5,5956 3834.7,5951.5 3827.2,5946.8 3824.3,5943.6 3823.8,5941.8 3824,5941 3826.2,5940.3 3839.7,5938.8 3880.6,5936.6 3966.6,5934 4079.1,5931.8 4142,5931 4205.6,5930.5 4322.7,5929.1 4416.9,5927.3 4476.6,5925.1 4490,5924 4512.4,5920.5 4553.3,5913.1 4589.4,5904.7 4621,5895.3 4648.6,5884.7 4672.5,5872.7 4688.3,5862.8 4697.9,5855.7 4711,5844.2 4719,5836 4722,5832.6 4727.6,5824.8 4732.5,5816 4736.9,5806.2 4740.6,5795.4 4743.7,5784 4747,5765.5 4749.3,5739.1 4748.9,5711.4 4745.8,5683.3 4740,5655.5 4736,5642 4734,5636.6 4728.9,5624.6 4718.7,5604.4 4701.7,5575 4682,5544.7 4661.5,5515.9 4641.6,5490.9 4628.2,5476 4620.4,5468.5 4613.6,5463.2 4608.2,5460.4 4606,5460 4602.9,5460.3 4596.2,5462.3 4589.4,5466.1 4583.5,5471.1 4581,5474 4577.8,5477.4 4568.3,5485.8 4546.6,5502.2 4504.7,5530.5 4449.9,5565.1 4384,5604.9 4308.8,5648.7 4226.1,5695.6 4137.7,5744.3 4092,5769 4038.8,5797.5 3943.2,5847.9 3869.1,5886 3833.1,5903.7 3820.5,5909.3 3818,5910 3817.7,5909.7 3818.9,5907.4 3824.9,5899.8 3850.3,5871.1 3908,5809.8 3986.3,5728.6 4031,5683 4083.9,5629 4153.7,5555.9 4194.1,5512 4229.9,5471.6 4261.3,5434.6 4288.4,5400.6 4311.4,5369.2 4330.4,5340.3 4345.8,5313.6 4357.7,5288.8 4366.2,5265.5 4371.5,5243.5 4373.9,5222.6 4373.4,5202.5 4370.4,5182.8 4368,5173 4365.4,5164.7 4358.3,5148.4 4348.6,5132.6 4336.7,5117.4 4322.5,5102.8 4306.4,5088.9 4288.5,5075.9 4269,5063.8 4247.9,5052.7 4225.6,5042.7 4202.1,5033.8 4177.6,5026.2 4152.4,5020 4126.4,5015.2 4100.1,5011.9 4073.4,5010.2 4060,5010 4023,5010 4016,5073 4014.3,5088.1 4007.9,5128.1 3998.6,5176.2 3987.6,5226.7 3982,5251 3973.7,5283.9 3950.8,5367.9 3922,5468.3 3890.2,5575.7 3858.4,5680.5 3829.3,5773.2 3806,5844.4 3794,5877.9 3789.2,5888.6 3788,5890 3787.5,5889.6 3786.6,5886.8 3785.4,5877.5 3783.3,5842.4 3781.2,5767.4 3780.1,5668.5 3780,5613 3779.8,5544.3 3778,5423.5 3775.4,5346.4 3772.9,5300.7 3769.8,5259.3 3766.1,5221.9 3761.7,5188.2 3756.6,5157.9 3750.7,5130.6 3744,5106.1 3736.5,5084.1 3728.1,5064.2 3718.8,5046.2 3708.5,5029.7 3703,5022 3698.5,5016.2 3689.2,5005.4 3679.6,4995.8 3669.7,4987.4 3659.3,4980.2 3648.5,4974.1 3637.1,4969.3 3625.1,4965.6 3612.5,4963 3599.2,4961.5 3585.1,4961.2 3570.3,4962 3554.5,4963.9 3537.9,4966.9 3511.1,4973.3 3492,4979 3481.7,4982.7 3457.4,4993.5 3429.7,5008.1 3400.7,5025.1 3372.2,5043.3 3346.4,5061.5 3325.1,5078.5 3313.3,5089.7 3307.9,5096.1 3306,5099 3305.7,5100.1 3306.7,5104.3 3311.8,5115.1 3324.1,5136 3341.2,5161.9 3351,5176 3362.3,5191.7 3388.6,5230.1 3416.7,5273.2 3443.4,5315.7 3455,5335 3471.1,5362.5 3511.6,5434.5 3584.8,5568.8 3659.3,5709.2 3702.4,5792 3734.9,5856.1 3749.6,5887 3753.8,5897.3 3754,5899 3753.5,5899 3750.8,5897.5 3743.3,5891.5 3716.5,5867.6 3660.5,5814.6 3587.6,5743.4 3547,5703 3505.1,5661.7 3423.2,5582.3 3351,5513.8 3297.3,5464.7 3280,5450 3264.9,5438.1 3234.2,5415.7 3203.2,5395.7 3172.7,5378.3 3143.1,5363.7 3115,5352.4 3095.2,5346.2 3082.8,5343.2 3071.1,5341.2 3060.2,5340.1 3055,5340 3045.5,5340.3 3027,5343 3009,5348.2 2991.8,5355.9 2975.2,5366.1 2959.5,5378.6 2944.6,5393.3 2930.6,5410.2 2917.6,5429.3 2905.6,5450.3 2894.6,5473.3 2884.8,5498.2 2876.2,5524.8 2868.8,5553.2 2862.6,5583.2 2857.9,5614.7 2856,5631 2850,5688 2933,5700 2951.7,5702.8 2997.7,5711.1 3049.7,5721.9 3101.4,5733.9 3125,5740 3151.1,5746.9 3224.4,5767.6 3368.5,5809.9 3571.8,5871.3 3688.9,5907.9 3731.2,5922.1 3738,5925 3738.9,5926.1 3739.3,5928.1 3737.7,5929.9 3733.7,5931.6 3722.6,5933.7 3697,5936 3630.7,5938.7 3478.5,5941.6 3370,5943 3306.9,5943.8 3200.7,5945.5 3118,5947.9 3054.4,5951.4 3016.8,5955.1 2995.6,5958.1 2976.8,5961.6 2959.9,5965.7 2944.5,5970.5 2929.9,5976 2908.6,5985.6 2894,5993 2886.9,5997 2871.4,6007.7 2855.5,6021 2841.1,6035.1 2835,6042 2830.6,6047.2 2823.3,6056.7 2817.8,6065.6 2814,6074.9 2811.6,6085.3 2810.5,6097.8 2810.8,6122.4 2812,6144 2813.1,6159.4 2817.1,6189.6 2823.8,6218.9 2833.1,6247.5 2845.1,6275.4 2859.8,6302.8 2877.4,6329.9 2897.7,6356.7 2909,6370 2919.5,6381.6 2932.6,6394.8 2939.9,6400.9 2946.2,6405.1 2951.6,6407.3 2956.5,6407.7 2960.9,6406.3 2963,6405 2985.3,6389.2 3034,6356 3088,6320.9 3147,6284 3210.9,6245.6 3279.2,6205.7 3351.8,6164.6 3428.3,6122.5 3468,6101 3521.2,6072.5 3616.8,6022.1 3690.9,5984 3726.9,5966.3 3739.5,5960.7 3742,5960 3742.3,5960.3 3741.1,5962.6 3735.3,5970 3710.5,5998.1 3654.1,6058.4 3577.6,6138.1 3534,6183 3482.6,6235.2 3414.2,6306.4 3374.2,6349.4 3338.6,6389.2 3307,6426 3279.5,6460 3255.7,6491.3 3235.7,6520.4 3219.1,6547.3 3205.9,6572.3 3195.9,6595.6 3188.9,6617.5 3184.8,6638.2 3183.4,6657.8 3184.5,6676.8 3186,6686 3187.7,6693.4 3192.4,6707.9 3199,6722.1 3207.3,6735.9 3217.4,6749.2 3229,6762 3242.2,6774.3 3256.8,6785.9 3272.8,6796.9 3290,6807.1 3308.5,6816.6 3328.1,6825.2 3348.7,6832.9 3370.3,6839.6 3392.8,6845.4 3416.1,6850.1 3428,6852 3444,6854.1 3474.3,6857.3 3499.6,6859 3513.7,6859.1 3519.9,6858.5 3522,6858 3523.8,6857 3527.3,6853.9 3530.5,6849 3533.4,6842.5 3537.2,6829.7 3541.4,6806.8 3543,6793 3544.9,6779.2 3551.2,6742.7 3559.8,6698.6 3569.8,6652.3 3575,6630 3582.9,6598.5 3605.4,6515.4 3634.4,6414.1 3666.8,6304.6 3699.4,6196.9 3729.4,6101.1 3753.5,6027.4 3765.9,5992.6 3770.7,5981.4 3772,5980 3772.5,5980.4 3773.4,5983.3 3774.6,5992.7 3776.7,6028.4 3778.8,6104.9 3779.9,6206.1 3780,6263 3780.1,6315.8 3780.9,6410.1 3782.7,6490.7 3785.5,6559.5 3789.6,6617.9 3794.9,6667.8 3801.7,6710.8 3810.2,6748.6 3815,6766 3818.4,6776.6 3827.1,6798 3838,6819.1 3850.6,6839.2 3864.4,6857.8 3878.8,6874 3893.2,6887.2 3903.9,6894.8 3910.7,6898.5 3914,6900 3921.1,6902.6 3937,6906.4 3955,6908.6 3974.8,6908.9 3996,6907.6 4018.2,6904.6 4041.1,6900 4064.4,6893.7 4076,6890 4076,6890 3675,7229 3667.5,7226 "


let mtzPolygon = mtzPoints.split(" ").map(function (point){
  pointStrings = point.split(",")
	xVal = parseFloat(pointStrings[0])
	yVal = parseFloat(pointStrings[1])
	return [xVal,yVal];
});


mtzPolygon.splice(-1)



//----------------------------------------------------------------------------
//  DRAWING FUNCTIONS
//----------------------------------------------------------------------------

function databind(data) {
	var allCircles = custom.selectAll('custom.circle')
		.data(data);

	allCircles.join('custom')
		.attr('class', 'circle')
		.attr("cx", d => 5*d.scatterXMobile + Math.random() )
		.attr("cy", d => 15*d.scatterYMobile + Math.random())
		//.attr("cx", d => d.scatterXMobile )
		//.attr("cy", d => d.scatterYMobile )
		.attr('r', 14)
		.attr('fillStyle', d => colorByNum(d.index%12))
		//.attr('fillStyle', d => "#7c97ff")
		.transition().duration(800)
		.attr("r",100)
		.attr('cx', d => 15*d.scatterXMobile + Math.random() )
		//.attr('cx', d => d.scatterXMobile )
		.transition().duration(800)
		.attr("r",20)
		.attr("cx", d=> 50*d.histogramX + 5*Math.random())
		.attr("cy", d=> canvasHeight - 45*d.histogramY + 5*Math.random())
		//.attr("cx", d=> d.histogramX)
		//.attr("cy", d=> canvasHeight - d.histogramY )
		.transition().duration(1200)
		.attr("r", d => 3 + 7*Math.random())
		.attr("cx", d=> 350 + d.mtzX/2)
		.attr("cy", d=> 150 + d.mtzY/2)
		.transition().delay(1200).duration(1000)
		.attr("cx", d=> d.shoeX)
		.attr("cy", d=> d.shoeY)
		.attr("fillStyle", d=> d.shoeColor)
		.transition().duration(5000)
		.attr("r", d => 3 + 7*Math.random())
		//.transition().duration(1200)
		//.attr("cx", d=> 2000*d.jitter)
		//.attr("cy", d=> d.index/2)
		;

} // databind()


// this function draws one frame onto the canvas
function drawCircles() {  // draw the elements on the canvas
  context.clearRect(0, 0, canvasWidth, canvasHeight); // Clear the canvas.

	var elements = custom.selectAll('custom.circle');// Grab all elements you bound data to in the databind() function.
	elements.each(function(d,i) { // For each virtual/custom element...

  // Draw each individual custom element with their properties.
  //for (let i = 0; i < circleData.length; i++) {
		var node = d3.select(this);   // This is each individual element in the loop.
    //let node = circleData[i];   // This is each individual element in the loop.
    context.fillStyle = node.attr('fillStyle');   // Here you retrieve the colour from the individual in-memory node and set the fillStyle for the canvas paint
    context.globalAlpha = 0.8;

    context.beginPath();
    context.arc(node.attr('cx'), node.attr('cy'), node.attr('r'), 0, 2*Math.PI, true);
    context.fill();
    context.closePath();

  }); // Loop through each element.

} // drawCircles




//----------------------------------------------------------------------------
//  ALL THE ACTION
//----------------------------------------------------------------------------

d3.json('circleData5000.json').then(data => {
  circleData = data.splice(10);
	//console.log(circleData)
	// add elements!
	for (let i = 0; i < circleData.length; i++) {
		let matchFound = false
		let randomX = 0
		let randomY = 0
		while (matchFound == false) {
			randomX = 2480 + 2600*Math.random()
			randomY = 4637 + 2600*Math.random()
			if (d3.polygonContains(mtzPolygon,[randomX,randomY])) {
				matchFound = true
				circleData[i].mtzX = randomX - 2480
				circleData[i].mtzY = randomY - 4637
			}
		}
		shoeFound = false
		while (shoeFound == false) {
			let randomX = 799*Math.random()
			let randomY = 456*Math.random()
			if (shoeCanvas.getContext('2d').getImageData(randomX, randomY, 1, 1).data[3] == 255) { // pixel has color other than alpha
				shoeFound = true
				shoePixel = shoeCanvas.getContext('2d').getImageData(randomX, randomY, 1, 1).data
				circleData[i].shoeX = 200+randomX*2
				circleData[i].shoeY = 300+randomY*2
				circleData[i].shoeColor = `rgb(${shoePixel[0]}, ${shoePixel[1]}, ${shoePixel[2]})`
			}
		}
		circleData[i].jitter = Math.random()
	}
}).then( function() {


	databind(circleData)

	// var t = d3.timer(function(elapsed) {
	// 	stats.begin();
	// 	drawCircles()
	// 	stats.end();
	// 	if (elapsed > 6000) t.stop();
	// }); // Timer running the draw function repeatedly for 300 ms.

})

var t = d3.timer(function(elapsed) {
	stats.begin();
	drawCircles()
	stats.end();
	if (elapsed > 12000) t.stop();
}); // Timer running the draw function repeatedly for 300 ms.
