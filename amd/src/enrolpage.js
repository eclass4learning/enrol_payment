define([ 'jquery'
       , 'core/modal_factory'
       , 'core/modal_events'
       , 'core/str'
       , 'core/config'
       , 'enrol_ecommerce/spin'
       ],
function($, ModalFactory, ModalEvents, MoodleStrings, MoodleCfg, Spinner) { //eslint-disable-line no-unused-vars

    /**
     * JavaScript functionality for the enrol_ecommerce enrol.html page
     */
    var EnrolPage = {

        /**
         * Set at init time. Moodle strings
         */
        mdlstr: undefined,

        /**
         * The payment gateway that will be used. Either "paypal" or "stripe"
         */
        gateway: null,

        /**
         * Set at init time.
         */
        originalCost: undefined,

        /**
         * Subtotal used for purchase.
         */
        subtotal: undefined,

        /**
         * ID of this enrollment instance. Set at init time.
         */
        instanceid: undefined,

        /**
         * Unique ID for this page visit
         */
        prepayToken: undefined,

        /**
         * Functions dealing with the multi-user registration system
         */
        MultipleRegistration: {

            enabled: false,

            /**
             * Counts up to make sure no two email inputs will ever
             * have the same ID.
             */
            nextEmailID: 1,

            /**
             * Reads email input fields, ignoring any that are whitespace-only.
             * @return An array of emails that have been inputted
             */
            getEmails: function() {
                var emails = [];

                $(".mr-email-line input").each(function() {
                    var email = $(this).val();
                    if($.trim(email) !== "") {
                        emails.push(email);
                    }
                });
                return emails;
            },

            /*
             * Handles a click on the plus sign next to each email input field,
             * adding a new input field and updating the enumeration.
             *
             * @param plus      The plus icon to attach a handler to
             */
            addPlusClickHandler: function(plus) {
                var self = this;

                plus.click(function() {
                    // Get HTML for the field we will create
                    var nextHtml = self.makeEmailEntryLine();

                    // Remove all plus signs (there should only be one at any
                    // given time)
                    $(".plus-container").remove();

                    // Add the new HTML to the bottom of our container, and update its click handlers.
                    var newLine = $("#multiple-registration-container").append(nextHtml);
                    self.addPlusClickHandler($('.plus-container'));
                    self.addMinusClickHandler(newLine.find('.minus-container'));
                });
            },

            /*
             * Handles a click on the minus sign next to each email input field,
             * adding a new input field and updating the enumeration.
             *
             * @param minus      The minus icon to attach a handler to
             */
            addMinusClickHandler: function(minus) {
                var self = this;

                minus.click(function() {
                    //Pop the whole email input line off the DOM.
                    $(this).parent().remove();

                    //Add a plus icon to the last line, if it's not already there
                    if (! $(".mr-email-line:last .plus-container").length) {
                        $(".mr-email-line:last").append(self.makePlusSign());
                        self.addPlusClickHandler($('.plus-container'));
                    }

                    //Re-number our rows for the user
                    self.refreshEmailNums();
                });
            },

            /**
             * Returns HTML for a plus icon
             *
             */
            makePlusSign: function() {
                var plusSign = "<div class=\"plus-container\"><img src=\""
                             + MoodleCfg.wwwroot + "/enrol/ecommerce/pix/plus.svg\" class=\"plus\"></div>";
                return plusSign;
            },

            /**
             * Returns HTML for a plus sign and a minus sign if there is more
             * than one row already, and just a plus sign if there is only one
             * row.
             *
             * @param n         Number of rows (including this one) that already exist
             */
            makePlusAndMinusSigns: function(n) {
                var plusSign = this.makePlusSign();
                var minusSign = "<div class=\"minus-container\"><img src=\""
                             + MoodleCfg.wwwroot + "/enrol/ecommerce/pix/minus.svg\" class=\"minus\"></div>";
                if (n > 1) {
                    return plusSign + minusSign;
                } else {
                    return plusSign;
                }
            },

            /**
             * Re-numbers the email labels on the frontend.
             *
             * @return The next number to use.
             */
            refreshEmailNums: function() {
                var lastIndex = -1;
                $('.email-num').each(function(index) {
                    $(this).text(index + 1);
                    lastIndex = index;
                });
                return lastIndex + 2;
            },

            /**
             * @return HTML for one row of the email entry form.
             */
            makeEmailEntryLine: function() {
                var self = this;
                var m = self.refreshEmailNums();
                var n = self.nextEmailID;
                self.nextEmailID = self.nextEmailID + 1;

                var inputID = "\"multiple-registration-email-" + n + "\"";
                var div = "<div class=\"mr-email-line\">";
                var label = "<div class=\"mr-email-label-container\"><label for=" + inputID + ">"
                          + "Email <span class=\"email-num\">" + m + "</span>:&nbsp;&nbsp;&nbsp;</label></div>";
                var emailEntryLine = "<input id=" + inputID + " type=\"text\" class=\"multiple-registration-email\" />";
                var endDiv = "</div>";

                // Passing n into makePlusAndMinusSigns works because the first
                // row never gets a minus.
                return div + label + emailEntryLine + this.makePlusAndMinusSigns(n) + endDiv;
            },

            checkoutConfirmModal: function(enrolPage, successmessage) {
                var trigger = $("#success-modal-trigger");
                trigger.off();

                ModalFactory.create({
                    type: ModalFactory.types.SAVE_CANCEL,
                    title: "Continue Checkout",
                    body: successmessage,
                }, trigger).done(function(modal) {
                    modal.setSaveButtonText("Confirm Payment");
                    modal.getRoot().on(ModalEvents.save, function(e) {
                        enrolPage.checkoutFinal();
                    });
                });

                $("#success-modal-trigger").click();
            },

            /**
             * @param r The raw AJAX response
             */
            handleEmailSubmitAJAXResponse: function(r, enrolPage) {
                var self = this;
                var response = JSON.parse(r);
                if(response["success"]) {
                    enrolPage.subtotal = response["subtotal"];
                    enrolPage.updateCostView();
                    self.checkoutConfirmModal(enrolPage, response["successmessage"]);
                } else {
                    var trigger = $("#error-modal-trigger");
                    trigger.off();
                    ModalFactory.create({
                        type: ModalFactory.types.DEFAULT,
                        body: response["failmessage"],
                        closebuttontitle: "Dismiss",
                    }, trigger);
                    $('#error-modal-trigger').click();
                }
            },

            /**
             * Checks emails for multiple registration, and submits payment to
             * PayPal.
             */
            verifyAndSubmit: function(enrolPage) {
                var self = this;

                if((enrolPage.gateway !== 'paypal') && (enrolPage.gateway !== 'stripe')) {
                    alert("Invalid payment provider.");
                    throw new Error("Invalid payment provider.");
                }

                var emails = self.getEmails();

                if (!emails.length) {
                    alert("No valid emails have been entered.");
                } else {
                    var ajaxURL = MoodleCfg.wwwroot + "/enrol/ecommerce/ajax/multiple_enrol.php";
                    $.ajax({
                        url: ajaxURL,
                        method: "POST",
                        data: {
                                'instanceid'  : enrolPage.instanceid
                              , 'prepaytoken' : enrolPage.prepayToken
                              , 'emails'      : JSON.stringify(emails)
                              , 'ipn_id'      : $("#" + enrolPage.gateway + "-custom").val()
                              },
                        context: document.body,
                        success: function(r) {
                            self.handleEmailSubmitAJAXResponse(r, enrolPage);
                        }
                    });
                }

            },

            /**
             * Handles a click on the Multiple Registration button and builds
             * the Multiple Registration form
             *
             * @param btn           JQuery object for the button
             */
            buildForm: function(btn) {
                var self = this;

                //If the button is to enable, build the multiple registration
                //form.
                if(!self.enabled) {
                    self.enabled = true;
                    self.nextEmailID = 1;
                    //Build DOM for a multiple-registration form

                    btn.text("Cancel multiple registration");
                    btn.removeClass('enable-mr').addClass('disable-mr');
                    $("#multiple-registration-container").html(this.makeEmailEntryLine());
                    self.addPlusClickHandler($(".plus-container"));

                } else {
                    self.enabled = false;
                    //Return to single registration mode

                    btn.text("Multiple Registration");
                    btn.removeClass('disable-mr').addClass('enable-mr');
                    $(".mr-email-line").remove();
                }
            },
        },

        Discount: {
            checkDiscountCode: function(enrolPage) {
                var discountcode = $("#discountcode").val();
                var checkURL = MoodleCfg.wwwroot + "/enrol/ecommerce/ajax/check_discount.php";

                $.ajax({
                    url: checkURL,
                    data: { 'discountcode' : discountcode
                          , 'instanceid'   : enrolPage.instanceid
                          , 'prepaytoken'  : enrolPage.prepayToken
                          },
                    context: document.body,
                    success: function(r) {
                        var response = JSON.parse(r);
                        if (response["success"]) {
                            enrolPage.subtotal = response["subtotal"];
                            enrolPage.updateCostView();
                        } else {
                            alert(response["failmessage"]);
                        }
                    }
                });
            },
        },

        checkoutFinal: function() {
            if(this.gateway === "paypal") {
                $("#paypal-form").submit();
            } else if(this.gateway === "stripe") {
                this.stripeCheckout();
            } else {
                throw new Error(this.mdlstr["invalidgateway"]);
            }
        },

        updateCostView: function() {
            $("span#localisedcost").text(this.subtotal);
            $("span.subtotal-display").text(this.subtotal);
            $("input[name=amount]").val(this.subtotal);
        },

        stripeCheckout: function(courseFullName) {
            var self = this;

            $.getScript("https://checkout.stripe.com/checkout.js", function() {
                //StripeCheckout is now globally available, but we will only use it here.

                var stripeHandler = StripeCheckout.configure({ //eslint-disable-line no-undef
                  key: self.stripePublishableKey,
                  image: self.stripeLogo || 'https://stripe.com/img/documentation/checkout/marketplace.png',
                  locale: 'auto',
                  shippingAddress: self.shippingRequired,
                  token: function(token) {
                      $('#stripe-form')
                          .append('<input type="hidden" name="stripeToken" value="' + token.id + '" />')
                          .append('<input type="hidden" name="stripeTokenType" value="' + token.type + '" />')
                          .append('<input type="hidden" name="stripeEmail" value="' + token.email + '" />')
                          .submit();
                  }
                });

                stripeHandler.open({
                    name: courseFullName,
                    description: "Test description",
                    zipCode: true,
                    //Stripe amount is in pennies
                    amount: Math.floor(Number.parseFloat(self.subtotal) * 100),
                });

            }).fail(function() {
                throw new Error("Could not load Stripe checkout library.");
            });
        },

        initClickHandlers: function() {
            var self = this;

            $("#apply-discount").click(function() {
                self.Discount.checkDiscountCode(self);
            });

            $("#multiple-registration-btn").click(function() {
                self.MultipleRegistration.buildForm($(this));
            });

            $(".ecommerce-checkout").click(function(e) {
                e.preventDefault();
                if (e.target.id === "paypal-button") {
                    self.gateway = "paypal";
                } else if (e.target.id === "stripe-button") {
                    self.gateway = "stripe";
                }

                if(self.MultipleRegistration.enabled) {
                    self.MultipleRegistration.verifyAndSubmit(self);
                } else {
                    $.ajax({
                        //Flip database row to single enrollment mode
                        url: MoodleCfg.wwwroot + "/enrol/ecommerce/ajax/single_enrol.php",
                        method: "POST",
                        data: {
                            "prepaytoken" : self.prepayToken
                        },
                        success: function() {
                            self.checkoutFinal();
                        },
                        failure: function() {
                            alert(mdlstr["errcommunicating"]);
                        }
                    });
                }
            });
        },

        init: function( instanceid
                      , stripePublishableKey
                      , cost
                      , prepayToken
                      , courseFullName
                      , shippingRequired
                      , stripeLogo ) {

            var self = this;

            /*
            var opts = {
              lines: 13, // The number of lines to draw
              length: 38, // The length of each line
              width: 17, // The line thickness
              radius: 45, // The radius of the inner circle
              scale: 0.65, // Scales overall size of the spinner
              corners: 1, // Corner roundness (0..1)
              color: '#ffffff', // CSS color or array of colors
              fadeColor: 'transparent', // CSS color or array of colors
              speed: 1, // Rounds per second
              rotate: 0, // The rotation offset
              animation: 'spinner-line-fade-quick', // The CSS animation name for the lines
              direction: 1, // 1: clockwise, -1: counterclockwise
              zIndex: 2e9, // The z-index (defaults to 2000000000)
              className: 'spinner', // The CSS class to assign to the spinner
              top: '50%', // Top position relative to parent
              left: '50%', // Left position relative to parent
              shadow: '0 0 1px transparent', // Box-shadow for the lines
              position: 'absolute' // Element positioning
            };

            var target = document.getElementById('enrolpage');
            new Spinner(opts).spin(target);
            */

            var str_promise = MoodleStrings.get_strings([
                    { key : "discounttypeerror" , component : "enrol_ecommerce" },
                    { key : "discountamounterror" , component : "enrol_ecommerce" },
                    { key : "invalidgateway" , component : "enrol_ecommerce" },
                    { key : "errcommunicating" , component : "enrol_ecommerce" }
            ]);
            str_promise.done(function(strs) {
                self.mdlstr = strs;
                self.originalCost = cost;
                self.subtotal = cost;
                self.instanceid = instanceid;
                self.stripePublishableKey = stripePublishableKey;
                self.courseFullName = courseFullName;
                self.shippingRequired = shippingRequired;
                self.prepayToken = prepayToken;
                self.stripeLogo = stripeLogo;

                self.initClickHandlers();
                self.updateCostView();
            });
        }
    };

    return EnrolPage;

});
