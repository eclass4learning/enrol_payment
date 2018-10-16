/**
 * Enrol page JS for Payment plugin
 *
 * @package enrol_payment
 * @copyright 2018 Seth Yoder <seth.a.yoder@gmail.com>
 * @license http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

define([ 'jquery'
       , 'core/modal_factory'
       , 'core/modal_events'
       , 'core/str'
       , 'core/config'
       , 'enrol_payment/spin'
       ],
function($, ModalFactory, ModalEvents, MoodleStrings, MoodleCfg, Spinner) { //eslint-disable-line no-unused-vars

    /**
     * JavaScript functionality for the enrol_payment enrol.html page
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
         *
         */
        taxAmount: undefined,

        /**
         * ID of this enrollment instance. Set at init time.
         */
        instanceid: undefined,

        /**
         * Unique ID for this page visit
         */
        prepayToken: undefined,

        /**
         * Billing address required
         */
        billingAddressRequired: undefined,

        /**
         * Should stripe validate zip code
         */
        validateZipCode: undefined,

        /**
         * Require user to enter shipping address?
         */
        shippingAddressRequired: undefined,

        /**
         * User's email address
         */
        userEmail: undefined,

        /**
         * Instance currency string
         */
        currency: undefined,

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
            addPlusClickHandler: function(plus, mdlstr) {
                var self = this;

                plus.click(function() {
                    // Get HTML for the field we will create
                    var nextHtml = self.makeEmailEntryLine(mdlstr);

                    // Remove all plus signs (there should only be one at any
                    // given time)
                    $(".plus-container").remove();

                    // Add the new HTML to the bottom of our container, and update its click handlers.
                    var newLine = $("#multiple-registration-container").append(nextHtml);
                    self.addPlusClickHandler($('.plus-container'), mdlstr);
                    self.addMinusClickHandler(newLine.find('.minus-container'), mdlstr);
                });
            },

            /*
             * Handles a click on the minus sign next to each email input field,
             * adding a new input field and updating the enumeration.
             *
             * @param minus      The minus icon to attach a handler to
             * @param mdlstr     Moodle Strings
             */
            addMinusClickHandler: function(minus, mdlstr) {
                var self = this;

                minus.click(function() {
                    //Pop the whole email input line off the DOM.
                    $(this).parent().remove();

                    //Add a plus icon to the last line, if it's not already there
                    if (! $(".mr-email-line:last .plus-container").length) {
                        $(".mr-email-line:last").append(self.makePlusSign(mdlstr));
                        self.addPlusClickHandler($('.plus-container'), mdlstr);
                    }

                    //Re-number our rows for the user
                    self.refreshEmailNums();
                });
            },

            /**
             * Returns HTML for a plus icon
             *
             */
            makePlusSign: function(mdlstr) {
                var plusSign = "<div class=\"plus-container\" title=\"" + mdlstr[4] + "\"><img src=\""
                             + MoodleCfg.wwwroot + "/enrol/payment/pix/plus.svg\" class=\"plus\"></div>";
                return plusSign;
            },

            /**
             * Returns HTML for a plus sign and a minus sign if there is more
             * than one row already, and just a plus sign if there is only one
             * row.
             *
             * @param n         Number of rows (including this one) that already exist
             * @param mdlstr    Moodle Strings
             */
            makePlusAndMinusSigns: function(n, mdlstr) {
                var plusSign = this.makePlusSign(mdlstr);
                var minusSign = "<div class=\"minus-container\" title=\"" + mdlstr[5] + "\"><img src=\""
                             + MoodleCfg.wwwroot + "/enrol/payment/pix/minus.svg\" class=\"minus\"></div>";
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
            makeEmailEntryLine: function(mdlstr) {
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
                return div + label + emailEntryLine + this.makePlusAndMinusSigns(n, mdlstr) + endDiv;
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
                    modal.getRoot().on(ModalEvents.save, function() {
                        enrolPage.checkoutFinal();
                    });
                    modal.getRoot().on(ModalEvents.destroyed, function() {
                        $("#dimmer").css('display','none');
                    });
                    modal.getRoot().on(ModalEvents.cancel, function() {
                        $("#dimmer").css('display','none');
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
                    var ajaxURL = MoodleCfg.wwwroot + "/enrol/payment/ajax/multiple_enrol.php";
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
            buildForm: function(btn, mdlstr) {
                var self = this;

                //If the button is to enable, build the multiple registration
                //form.
                if(!self.enabled) {
                    self.enabled = true;
                    self.nextEmailID = 1;
                    //Build DOM for a multiple-registration form

                    btn.text("Cancel multiple registration");
                    btn.removeClass('enable-mr').addClass('disable-mr');
                    $("#multiple-registration-container").html(this.makeEmailEntryLine(mdlstr));
                    self.addPlusClickHandler($(".plus-container"), mdlstr);

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
                var checkURL = MoodleCfg.wwwroot + "/enrol/payment/ajax/check_discount.php";

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
                            $('#discount-dimmer').css('display','block');
                            $('.discount-check').css('visibility','visible');
                            enrolPage.subtotal = response["subtotal"];
                            enrolPage.updateCostView();
                        } else {
                            alert(response["failmessage"]);
                        }
                    },
                    error: function() {
                        alert("Incorrect discount code.");
                    }
                });
            },
        },

        checkoutFinal: function() {
            if(this.gateway === "paypal") {
                $("#paypal-form input[name=amount]").val(this.subtotal);
                $("#paypal-form input[name=tax]").val(this.taxAmount * this.subtotal);
                $("#paypal-form").submit();
            } else if(this.gateway === "stripe") {
                $("#stripe-form input[name=amount]").val(this.subtotal);
                this.stripeCheckout();
            } else {
                throw new Error(this.mdlstr[2]);
            }
        },

        getTaxedAmount: function() {
            //coerce into float
            var sub = Number.parseFloat(this.subtotal);
            var tax = Number.parseFloat(this.taxAmount);
            return Number.parseFloat(sub + (sub * tax)).toFixed(2);
        },

        updateCostView: function() {
            $("span.localisedcost-untaxed").text(Number.parseFloat(this.subtotal).toFixed(2));
            $("span.localisedcost").text(this.getTaxedAmount());
            $("span.subtotal-display").text(this.getTaxedAmount());
        },

        stripeCheckout: function() {
            var self = this;

            $.getScript("https://checkout.stripe.com/checkout.js", function() {
                // StripeCheckout is now globally available, but we will only
                // use it here. Since this javascript code is called from PHP,
                // we can't load in checkout.js from the HTML, so we have to
                // do it here.

                var stripeHandler = StripeCheckout.configure({ //eslint-disable-line no-undef
                  key: self.stripePublishableKey,
                  image: self.stripeLogo || 'https://stripe.com/img/documentation/checkout/marketplace.png',
                  locale: 'auto',
                  billingAddress: self.billingAddressRequired,
                  shippingAddress: self.shippingAddressRequired,
                  email: self.userEmail || null,
                  allowRememberMe: false,
                  zipCode: self.validateZipCode,
                  token: function(token) {
                      $('#stripe-form')
                          .append('<input type="hidden" name="stripeToken" value="' + token.id + '" />')
                          .append('<input type="hidden" name="stripeTokenType" value="' + token.type + '" />')
                          .append('<input type="hidden" name="stripeEmail" value="' + token.email + '" />')
                          .submit();
                  }
                });

                stripeHandler.open({
                    name: decodeURIComponent(self.courseFullName),
                    description: "Total enrolment fee: $" + self.getTaxedAmount() + " " + self.currency,
                    zipCode: true,
                    //Stripe amount is in pennies
                    amount: Math.floor(Number.parseFloat(self.getTaxedAmount()) * 100),
                    closed: function() { $("#dimmer").css('display', 'none'); }
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
                self.MultipleRegistration.buildForm($(this), self.mdlstr);
            });

            $(".payment-checkout").click(function(e) {
                $('#dimmer').css('display', 'block');
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
                        url: MoodleCfg.wwwroot + "/enrol/payment/ajax/single_enrol.php",
                        method: "POST",
                        data: {
                            "prepaytoken" : self.prepayToken
                        },
                        success: function() {
                            self.checkoutFinal();
                        },
                        error: function() {
                            alert(self.mdlstr[3]);
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
                      , shippingAddressRequired
                      , stripeLogo
                      , taxAmount
                      , validateZipCode
                      , billingAddressRequired
                      , userEmail
                      , currency ) {

            var self = this;

            var str_promise = MoodleStrings.get_strings([
                    { key : "discounttypeerror" , component : "enrol_payment" },
                    { key : "discountamounterror" , component : "enrol_payment" },
                    { key : "invalidgateway" , component : "enrol_payment" },
                    { key : "errcommunicating" , component : "enrol_payment" },
                    { key : "addaregistrant" , component : "enrol_payment" },
                    { key : "removearegistrant" , component : "enrol_payment" }
            ]);
            str_promise.done(function(strs) {
                self.mdlstr = strs;
                self.originalCost = Number.parseFloat(cost);
                self.taxAmount = Number.parseFloat(taxAmount);
                self.subtotal = Number.parseFloat(cost).toFixed(2);
                self.instanceid = instanceid;
                self.stripePublishableKey = stripePublishableKey;
                self.courseFullName = courseFullName;
                self.shippingAddressRequired = shippingAddressRequired == 1 ? true : false;
                self.prepayToken = prepayToken;
                self.stripeLogo = stripeLogo;
                self.validateZipCode = validateZipCode == 1 ? true : false;
                self.billingAddressRequired = billingAddressRequired == 1 ? true : false;
                self.userEmail = userEmail;
                self.currency = currency;

                self.initClickHandlers();
                self.updateCostView();

                $('#dimmer').css('display', 'none');
            });
        }
    };

    return EnrolPage;

});
